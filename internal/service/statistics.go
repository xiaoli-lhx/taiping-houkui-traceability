package service

import (
	"time"

	"gorm.io/gorm"
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
