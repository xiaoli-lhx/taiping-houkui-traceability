package service

import (
	"fmt"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type StatisticsService struct {
	db *gorm.DB
}

type OverviewStats struct {
	TotalBatches     int64   `json:"total_batches"`
	PublicBatches    int64   `json:"public_batches"`
	TotalEvaluations int64   `json:"total_evaluations"`
	AverageScore     float64 `json:"average_score"`
}

type ProductionDistributionItem struct {
	Origin          string  `json:"origin"`
	BatchCount      int64   `json:"batch_count"`
	TotalQuantityKg float64 `json:"total_quantity_kg"`
}

type GradeDistributionItem struct {
	Grade string `json:"grade"`
	Count int64  `json:"count"`
}

type MetricTrendItem struct {
	Day          string  `json:"day"`
	MetricName   string  `json:"metric_name"`
	MetricLabel  string  `json:"metric_label"`
	AverageScore float64 `json:"average_score"`
}

type RiskAlertItem struct {
	Type        string  `json:"type"`
	Severity    string  `json:"severity"`
	BatchID     uint    `json:"batch_id"`
	BatchCode   string  `json:"batch_code"`
	TraceCode   string  `json:"trace_code"`
	Message     string  `json:"message"`
	MetricValue float64 `json:"metric_value"`
}

func NewStatisticsService(db *gorm.DB) *StatisticsService {
	return &StatisticsService{db: db}
}

func (s *StatisticsService) GetOverview() (*OverviewStats, error) {
	stats := &OverviewStats{}

	if err := s.db.Table("tea_batches").Count(&stats.TotalBatches).Error; err != nil {
		return nil, err
	}
	if err := s.db.Table("tea_batches").Where("public_visible = ?", true).Count(&stats.PublicBatches).Error; err != nil {
		return nil, err
	}
	if err := s.db.Table("quality_evaluations").Count(&stats.TotalEvaluations).Error; err != nil {
		return nil, err
	}
	if err := s.db.Table("quality_evaluations").Select("COALESCE(AVG(total_score), 0)").Scan(&stats.AverageScore).Error; err != nil {
		return nil, err
	}

	stats.AverageScore = round2(stats.AverageScore)
	return stats, nil
}

func (s *StatisticsService) GetProductionDistribution() ([]ProductionDistributionItem, error) {
	var items []ProductionDistributionItem
	err := s.db.Table("tea_batches").
		Select("origin, COUNT(*) AS batch_count, COALESCE(SUM(quantity_kg), 0) AS total_quantity_kg").
		Group("origin").
		Order("total_quantity_kg DESC").
		Scan(&items).Error
	if err != nil {
		return nil, err
	}

	for index := range items {
		items[index].TotalQuantityKg = round2(items[index].TotalQuantityKg)
	}

	return items, nil
}

func (s *StatisticsService) GetGradeDistribution() ([]GradeDistributionItem, error) {
	var items []GradeDistributionItem
	err := s.db.Table("quality_evaluations").
		Select("grade, COUNT(*) AS count").
		Group("grade").
		Order("count DESC").
		Scan(&items).Error
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (s *StatisticsService) GetMetricTrends(days int, metricName string) ([]MetricTrendItem, error) {
	if days <= 0 {
		days = 30
	}

	query := s.db.Table("quality_metric_details qmd").
		Select("DATE_FORMAT(qe.evaluated_at, '%Y-%m-%d') AS day, qmd.metric_name, AVG(qmd.raw_score) AS average_score").
		Joins("JOIN quality_evaluations qe ON qe.id = qmd.evaluation_id").
		Where("qe.evaluated_at >= ?", time.Now().AddDate(0, 0, -days)).
		Group("DATE_FORMAT(qe.evaluated_at, '%Y-%m-%d'), qmd.metric_name").
		Order("day ASC, qmd.metric_name ASC")

	if normalized, ok := normalizeMetricName(metricName); ok {
		query = query.Where("qmd.metric_name = ?", normalized)
	}

	var items []MetricTrendItem
	if err := query.Scan(&items).Error; err != nil {
		return nil, err
	}

	for index := range items {
		items[index].AverageScore = round2(items[index].AverageScore)
		if label, ok := metricLabels[items[index].MetricName]; ok {
			items[index].MetricLabel = label
		}
	}

	return items, nil
}

func (s *StatisticsService) GetRiskAlerts() ([]RiskAlertItem, error) {
	var batches []model.TeaBatch
	if err := s.db.Find(&batches).Error; err != nil {
		return nil, err
	}

	alerts := make([]RiskAlertItem, 0)
	for _, batch := range batches {
		var latestEvaluation model.QualityEvaluation
		evaluationErr := s.db.Where("batch_id = ?", batch.ID).Order("evaluated_at DESC, id DESC").First(&latestEvaluation).Error
		if evaluationErr == nil && latestEvaluation.TotalScore < 75 {
			alerts = append(alerts, RiskAlertItem{
				Type:        "low_score",
				Severity:    "high",
				BatchID:     batch.ID,
				BatchCode:   batch.BatchCode,
				TraceCode:   batch.TraceCode,
				Message:     fmt.Sprintf("批次最新品质得分 %.2f，低于风险阈值 75 分。", round2(latestEvaluation.TotalScore)),
				MetricValue: round2(latestEvaluation.TotalScore),
			})
		}

		if batch.PublicVisible && batch.AuditStatus != model.AuditStatusApproved {
			alerts = append(alerts, RiskAlertItem{
				Type:        "public_unapproved",
				Severity:    "high",
				BatchID:     batch.ID,
				BatchCode:   batch.BatchCode,
				TraceCode:   batch.TraceCode,
				Message:     "批次已开放公开查询，但当前审核状态未通过。",
				MetricValue: 1,
			})
		}

		var stageCount int64
		if err := s.db.Model(&model.TraceStageRecord{}).
			Where("batch_id = ? AND updated_at >= ?", batch.ID, time.Now().AddDate(0, 0, -7)).
			Count(&stageCount).Error; err != nil {
			return nil, err
		}
		if stageCount >= 3 {
			alerts = append(alerts, RiskAlertItem{
				Type:        "frequent_stage_updates",
				Severity:    "medium",
				BatchID:     batch.ID,
				BatchCode:   batch.BatchCode,
				TraceCode:   batch.TraceCode,
				Message:     "近 7 天内阶段记录新增或更新次数较多，建议监管复核。",
				MetricValue: float64(stageCount),
			})
		}

		var feedbackCount int64
		if err := s.db.Model(&model.UserFeedback{}).
			Where("batch_id = ? AND status <> ? AND created_at >= ?", batch.ID, model.FeedbackStatusResolved, time.Now().AddDate(0, 0, -30)).
			Count(&feedbackCount).Error; err != nil {
			return nil, err
		}
		if feedbackCount >= 3 {
			alerts = append(alerts, RiskAlertItem{
				Type:        "feedback_spike",
				Severity:    "medium",
				BatchID:     batch.ID,
				BatchCode:   batch.BatchCode,
				TraceCode:   batch.TraceCode,
				Message:     "近 30 天内未关闭消费者反馈数量较多，建议尽快处理。",
				MetricValue: float64(feedbackCount),
			})
		}
	}

	return alerts, nil
}
