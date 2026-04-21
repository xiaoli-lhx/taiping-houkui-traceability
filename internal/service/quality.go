package service

import (
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

var metricAliases = map[string]string{
	"appearance": "appearance",
	"外形":         "appearance",
	"color":      "color",
	"色泽":         "color",
	"aroma":      "aroma",
	"香气":         "aroma",
	"taste":      "taste",
	"滋味":         "taste",
}

var metricLabels = map[string]string{
	"appearance": "外形",
	"color":      "色泽",
	"aroma":      "香气",
	"taste":      "滋味",
}

var metricWeights = map[string]float64{
	"appearance": 0.30,
	"color":      0.20,
	"aroma":      0.25,
	"taste":      0.25,
}

var metricOrder = []string{"appearance", "color", "aroma", "taste"}

type QualityService struct {
	db *gorm.DB
}

type MetricInput struct {
	MetricName string  `json:"metric_name"`
	Score      float64 `json:"score"`
	Comment    string  `json:"comment,omitempty"`
}

type MetricRadarItem struct {
	MetricName    string  `json:"metric_name"`
	MetricLabel   string  `json:"metric_label"`
	Score         float64 `json:"score"`
	Weight        float64 `json:"weight"`
	WeightedScore float64 `json:"weighted_score"`
	Comment       string  `json:"comment,omitempty"`
}

type QualityScoreResult struct {
	TotalScore float64           `json:"total_score"`
	Grade      string            `json:"grade"`
	Summary    string            `json:"summary"`
	RadarData  []MetricRadarItem `json:"radar_data"`
}

type CreateQualityEvaluationInput struct {
	BatchID     uint
	EvaluatorID uint
	RuleVersion string
	Summary     string
	Metrics     []MetricInput
	EvaluatedAt *time.Time
}

type QualityEvaluationView struct {
	Evaluation model.QualityEvaluation `json:"evaluation"`
	RadarData  []MetricRadarItem       `json:"radar_data"`
}

func NewQualityService(db *gorm.DB) *QualityService {
	return &QualityService{db: db}
}

func CalculateQualityScore(inputs []MetricInput) (*QualityScoreResult, error) {
	seen := make(map[string]struct{}, len(metricWeights))
	radarData := make([]MetricRadarItem, 0, len(metricWeights))
	totalScore := 0.0

	for _, input := range inputs {
		metricName, ok := normalizeMetricName(input.MetricName)
		if !ok || input.Score < 0 || input.Score > 100 {
			return nil, ErrInvalidMetrics
		}
		if _, exists := seen[metricName]; exists {
			return nil, ErrInvalidMetrics
		}
		seen[metricName] = struct{}{}

		weighted := round2(input.Score * metricWeights[metricName])
		totalScore += weighted
		radarData = append(radarData, MetricRadarItem{
			MetricName:    metricName,
			MetricLabel:   metricLabels[metricName],
			Score:         round2(input.Score),
			Weight:        metricWeights[metricName],
			WeightedScore: weighted,
			Comment:       strings.TrimSpace(input.Comment),
		})
	}

	if len(seen) != len(metricWeights) {
		return nil, ErrInvalidMetrics
	}

	sort.Slice(radarData, func(i, j int) bool {
		return metricIndex(radarData[i].MetricName) < metricIndex(radarData[j].MetricName)
	})

	totalScore = round2(totalScore)
	grade := gradeFromScore(totalScore)

	return &QualityScoreResult{
		TotalScore: totalScore,
		Grade:      grade,
		Summary:    buildQualitySummary(radarData, totalScore, grade),
		RadarData:  radarData,
	}, nil
}

func (s *QualityService) CreateEvaluation(input CreateQualityEvaluationInput) (*QualityEvaluationView, error) {
	var batch model.TeaBatch
	if err := s.db.First(&batch, input.BatchID).Error; err != nil {
		return nil, err
	}

	scoreResult, err := CalculateQualityScore(input.Metrics)
	if err != nil {
		return nil, err
	}

	evaluatedAt := time.Now()
	if input.EvaluatedAt != nil {
		evaluatedAt = *input.EvaluatedAt
	}

	summary := strings.TrimSpace(input.Summary)
	if summary == "" {
		summary = scoreResult.Summary
	}

	evaluation := model.QualityEvaluation{
		BatchID:     input.BatchID,
		EvaluatorID: input.EvaluatorID,
		RuleVersion: defaultRuleVersion(input.RuleVersion),
		TotalScore:  scoreResult.TotalScore,
		Grade:       scoreResult.Grade,
		Summary:     summary,
		EvaluatedAt: evaluatedAt,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&evaluation).Error; err != nil {
			return err
		}

		details := make([]model.QualityMetricDetail, 0, len(scoreResult.RadarData))
		for _, item := range scoreResult.RadarData {
			details = append(details, model.QualityMetricDetail{
				EvaluationID:  evaluation.ID,
				MetricName:    item.MetricName,
				RawScore:      item.Score,
				Weight:        item.Weight,
				WeightedScore: item.WeightedScore,
				Comment:       item.Comment,
			})
		}

		if err := tx.Create(&details).Error; err != nil {
			return err
		}

		return tx.Model(&model.TeaBatch{}).Where("id = ?", input.BatchID).Update("latest_grade", scoreResult.Grade).Error
	})
	if err != nil {
		return nil, err
	}

	return s.GetEvaluation(evaluation.ID)
}

func (s *QualityService) GetEvaluation(id uint) (*QualityEvaluationView, error) {
	var evaluation model.QualityEvaluation
	if err := s.db.Preload("MetricDetails", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	}).First(&evaluation, id).Error; err != nil {
		return nil, err
	}

	return &QualityEvaluationView{
		Evaluation: evaluation,
		RadarData:  metricDetailsToRadarData(evaluation.MetricDetails),
	}, nil
}

func (s *QualityService) GetLatestByBatch(batchID uint) (*QualityEvaluationView, error) {
	var evaluation model.QualityEvaluation
	if err := s.db.Preload("MetricDetails", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	}).Where("batch_id = ?", batchID).Order("evaluated_at DESC, id DESC").First(&evaluation).Error; err != nil {
		return nil, err
	}

	return &QualityEvaluationView{
		Evaluation: evaluation,
		RadarData:  metricDetailsToRadarData(evaluation.MetricDetails),
	}, nil
}

func metricDetailsToRadarData(details []model.QualityMetricDetail) []MetricRadarItem {
	items := make([]MetricRadarItem, 0, len(details))
	for _, detail := range details {
		name, ok := normalizeMetricName(detail.MetricName)
		if !ok {
			name = detail.MetricName
		}
		items = append(items, MetricRadarItem{
			MetricName:    name,
			MetricLabel:   metricLabels[name],
			Score:         round2(detail.RawScore),
			Weight:        round2(detail.Weight),
			WeightedScore: round2(detail.WeightedScore),
			Comment:       detail.Comment,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		return metricIndex(items[i].MetricName) < metricIndex(items[j].MetricName)
	})
	return items
}

func normalizeMetricName(name string) (string, bool) {
	normalized, ok := metricAliases[strings.ToLower(strings.TrimSpace(name))]
	return normalized, ok
}

func metricIndex(metricName string) int {
	for index, item := range metricOrder {
		if item == metricName {
			return index
		}
	}
	return len(metricOrder)
}

func gradeFromScore(score float64) string {
	switch {
	case score >= 90:
		return "特级"
	case score >= 80:
		return "一级"
	case score >= 70:
		return "二级"
	default:
		return "待改进"
	}
}

func buildQualitySummary(items []MetricRadarItem, totalScore float64, grade string) string {
	if len(items) == 0 {
		return fmt.Sprintf("综合得分 %.2f，等级判定为%s。", totalScore, grade)
	}

	sorted := append([]MetricRadarItem(nil), items...)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].Score > sorted[j].Score
	})

	best := sorted[0]
	worst := sorted[len(sorted)-1]

	return fmt.Sprintf(
		"综合得分 %.2f，等级判定为%s。优势指标为%s，相对薄弱指标为%s，可作为后续品质改进重点。",
		totalScore,
		grade,
		best.MetricLabel,
		worst.MetricLabel,
	)
}

func defaultRuleVersion(ruleVersion string) string {
	if strings.TrimSpace(ruleVersion) == "" {
		return "v1"
	}
	return strings.TrimSpace(ruleVersion)
}

func round2(value float64) float64 {
	return math.Round(value*100) / 100
}
