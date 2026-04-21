package service

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

var stageAliases = map[string]string{
	"planting":     model.StagePlanting,
	"种植":           model.StagePlanting,
	"picking":      model.StagePicking,
	"采摘":           model.StagePicking,
	"processing":   model.StageProcessing,
	"加工":           model.StageProcessing,
	"packaging":    model.StagePackaging,
	"包装":           model.StagePackaging,
	"distribution": model.StageDistribution,
	"流通":           model.StageDistribution,
}

type TraceService struct {
	db *gorm.DB
}

type BatchListFilter struct {
	Keyword     string
	Status      string
	AuditStatus string
	Origin      string
	Page        int
	PageSize    int
	ViewerID    uint
	ViewerRole  string
	ViewerOrg   string
}

type BatchUpsertInput struct {
	BatchCode      string
	TraceCode      string
	ProductCode    string
	TeaName        string
	TeaType        string
	Origin         string
	FarmName       string
	EnterpriseName string
	QuantityKg     float64
	HarvestDate    *time.Time
	PackagingDate  *time.Time
	Status         string
	PublicVisible  bool
	Notes          string
}

type StageUpsertInput struct {
	Stage       string
	Sequence    int
	Title       string
	Description string
	Location    string
	OccurredAt  time.Time
}

type AuditInput struct {
	StageRecordID *uint
	Action        string
	Status        string
	Comment       string
}

type PublicBatchSummary struct {
	ID             uint       `json:"id"`
	BatchCode      string     `json:"batch_code"`
	TraceCode      string     `json:"trace_code"`
	ProductCode    string     `json:"product_code"`
	TeaName        string     `json:"tea_name"`
	TeaType        string     `json:"tea_type"`
	Origin         string     `json:"origin"`
	FarmName       string     `json:"farm_name"`
	EnterpriseName string     `json:"enterprise_name"`
	QuantityKg     float64    `json:"quantity_kg"`
	HarvestDate    *time.Time `json:"harvest_date,omitempty"`
	PackagingDate  *time.Time `json:"packaging_date,omitempty"`
	AuditStatus    string     `json:"audit_status"`
	LatestGrade    string     `json:"latest_grade"`
}

type PublicTraceView struct {
	Batch            PublicBatchSummary       `json:"batch"`
	TracePath        []model.TraceStageRecord `json:"trace_path"`
	LatestEvaluation *QualityEvaluationView   `json:"latest_evaluation,omitempty"`
}

func NewTraceService(db *gorm.DB) *TraceService {
	return &TraceService{db: db}
}

func (s *TraceService) ListBatches(filter BatchListFilter) ([]model.TeaBatch, int64, error) {
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}

	query := s.db.Model(&model.TeaBatch{})
	query = applyBatchScope(query, filter.ViewerRole, filter.ViewerOrg, filter.ViewerID)
	if keyword := strings.TrimSpace(filter.Keyword); keyword != "" {
		query = query.Where(
			"batch_code LIKE ? OR trace_code LIKE ? OR product_code LIKE ?",
			"%"+keyword+"%",
			"%"+keyword+"%",
			"%"+keyword+"%",
		)
	}
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if auditStatus := strings.TrimSpace(filter.AuditStatus); auditStatus != "" {
		query = query.Where("audit_status = ?", auditStatus)
	}
	if origin := strings.TrimSpace(filter.Origin); origin != "" {
		query = query.Where("origin LIKE ?", "%"+origin+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var batches []model.TeaBatch
	if err := query.Order("created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&batches).Error; err != nil {
		return nil, 0, err
	}

	return batches, total, nil
}

func (s *TraceService) CanAccessBatch(batch *model.TeaBatch, operator OperatorContext) bool {
	switch operator.PrimaryRole() {
	case model.RoleAdmin, model.RoleRegulator:
		return true
	case model.RoleFarmer:
		return batch.FarmName == operator.OrganizationName() || batch.CreatedBy == operator.UserID
	case model.RoleEnterprise:
		return batch.EnterpriseName == operator.OrganizationName() || batch.CreatedBy == operator.UserID
	default:
		return false
	}
}

func (s *TraceService) CreateBatch(input BatchUpsertInput, operator OperatorContext) (*model.TeaBatch, error) {
	batch := model.TeaBatch{
		BatchCode:      strings.TrimSpace(input.BatchCode),
		TraceCode:      strings.TrimSpace(input.TraceCode),
		ProductCode:    strings.TrimSpace(input.ProductCode),
		TeaName:        defaultTeaName(input.TeaName),
		TeaType:        defaultTeaType(input.TeaType),
		Origin:         strings.TrimSpace(input.Origin),
		FarmName:       strings.TrimSpace(input.FarmName),
		EnterpriseName: strings.TrimSpace(input.EnterpriseName),
		QuantityKg:     round2(input.QuantityKg),
		HarvestDate:    input.HarvestDate,
		PackagingDate:  input.PackagingDate,
		Status:         defaultBatchStatus(input.Status),
		AuditStatus:    model.AuditStatusPending,
		PublicVisible:  input.PublicVisible,
		Notes:          strings.TrimSpace(input.Notes),
		CreatedBy:      operator.UserID,
	}

	if batch.TraceCode == "" {
		batch.TraceCode = buildTraceCode(batch.BatchCode)
	}

	if err := s.db.Create(&batch).Error; err != nil {
		return nil, err
	}

	return &batch, nil
}

func (s *TraceService) UpdateBatch(id uint, input BatchUpsertInput) (*model.TeaBatch, error) {
	var batch model.TeaBatch
	if err := s.db.First(&batch, id).Error; err != nil {
		return nil, err
	}

	batch.BatchCode = strings.TrimSpace(input.BatchCode)
	batch.TraceCode = strings.TrimSpace(input.TraceCode)
	if batch.TraceCode == "" {
		batch.TraceCode = buildTraceCode(batch.BatchCode)
	}
	batch.ProductCode = strings.TrimSpace(input.ProductCode)
	batch.TeaName = defaultTeaName(input.TeaName)
	batch.TeaType = defaultTeaType(input.TeaType)
	batch.Origin = strings.TrimSpace(input.Origin)
	batch.FarmName = strings.TrimSpace(input.FarmName)
	batch.EnterpriseName = strings.TrimSpace(input.EnterpriseName)
	batch.QuantityKg = round2(input.QuantityKg)
	batch.HarvestDate = input.HarvestDate
	batch.PackagingDate = input.PackagingDate
	batch.Status = defaultBatchStatus(input.Status)
	batch.PublicVisible = input.PublicVisible
	batch.Notes = strings.TrimSpace(input.Notes)

	if err := s.db.Save(&batch).Error; err != nil {
		return nil, err
	}

	return s.GetBatch(id)
}

func (s *TraceService) GetBatch(id uint) (*model.TeaBatch, error) {
	var batch model.TeaBatch
	if err := s.db.
		Preload("StageRecords", func(db *gorm.DB) *gorm.DB {
			return db.Order("sequence ASC, occurred_at ASC")
		}).
		Preload("QualityEvaluations", func(db *gorm.DB) *gorm.DB {
			return db.Order("evaluated_at DESC, id DESC")
		}).
		Preload("QualityEvaluations.MetricDetails", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Preload("AuditRecords", func(db *gorm.DB) *gorm.DB {
			return db.Order("reviewed_at DESC, id DESC")
		}).
		First(&batch, id).Error; err != nil {
		return nil, err
	}

	return &batch, nil
}

func (s *TraceService) CreateStage(batchID uint, input StageUpsertInput, operator OperatorContext) (*model.TraceStageRecord, error) {
	if err := s.db.First(&model.TeaBatch{}, batchID).Error; err != nil {
		return nil, err
	}

	stageName := normalizeStage(input.Stage)
	if stageName == "" {
		return nil, fmt.Errorf("阶段类型不合法")
	}

	sequence := input.Sequence
	if sequence <= 0 {
		var count int64
		if err := s.db.Model(&model.TraceStageRecord{}).Where("batch_id = ?", batchID).Count(&count).Error; err != nil {
			return nil, err
		}
		sequence = int(count) + 1
	}

	occurredAt := input.OccurredAt
	if occurredAt.IsZero() {
		occurredAt = time.Now()
	}

	stage := model.TraceStageRecord{
		BatchID:      batchID,
		Stage:        stageName,
		Sequence:     sequence,
		Title:        strings.TrimSpace(input.Title),
		Description:  strings.TrimSpace(input.Description),
		Location:     strings.TrimSpace(input.Location),
		OperatorID:   operator.UserID,
		OperatorName: operator.Name(),
		OperatorRole: operator.PrimaryRole(),
		OccurredAt:   occurredAt,
	}

	if err := s.db.Create(&stage).Error; err != nil {
		return nil, err
	}

	return &stage, nil
}

func (s *TraceService) UpdateStage(id uint, input StageUpsertInput, operator OperatorContext) (*model.TraceStageRecord, error) {
	var stage model.TraceStageRecord
	if err := s.db.First(&stage, id).Error; err != nil {
		return nil, err
	}

	stageName := normalizeStage(input.Stage)
	if stageName == "" {
		return nil, fmt.Errorf("阶段类型不合法")
	}

	stage.Stage = stageName
	stage.Sequence = input.Sequence
	stage.Title = strings.TrimSpace(input.Title)
	stage.Description = strings.TrimSpace(input.Description)
	stage.Location = strings.TrimSpace(input.Location)
	stage.OperatorID = operator.UserID
	stage.OperatorName = operator.Name()
	stage.OperatorRole = operator.PrimaryRole()
	stage.OccurredAt = input.OccurredAt
	if stage.OccurredAt.IsZero() {
		stage.OccurredAt = time.Now()
	}

	if err := s.db.Save(&stage).Error; err != nil {
		return nil, err
	}

	return &stage, nil
}

func (s *TraceService) DeleteStage(id uint) error {
	result := s.db.Delete(&model.TraceStageRecord{}, id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (s *TraceService) ListAudits(batchID uint) ([]model.AuditRecord, error) {
	var records []model.AuditRecord
	if err := s.db.Where("batch_id = ?", batchID).Order("reviewed_at DESC, id DESC").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (s *TraceService) CreateAudit(batchID uint, input AuditInput, operator OperatorContext) (*model.AuditRecord, error) {
	if err := s.db.First(&model.TeaBatch{}, batchID).Error; err != nil {
		return nil, err
	}

	if input.StageRecordID != nil {
		var stage model.TraceStageRecord
		if err := s.db.First(&stage, *input.StageRecordID).Error; err != nil {
			return nil, err
		}
		if stage.BatchID != batchID {
			return nil, fmt.Errorf("审核阶段记录与批次不匹配")
		}
	}

	audit := model.AuditRecord{
		BatchID:       batchID,
		StageRecordID: input.StageRecordID,
		ReviewerID:    operator.UserID,
		ReviewerName:  operator.Name(),
		Action:        defaultAuditAction(input.Action),
		Status:        defaultAuditStatus(input.Status),
		Comment:       strings.TrimSpace(input.Comment),
		ReviewedAt:    time.Now(),
	}

	if err := s.db.Create(&audit).Error; err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.TeaBatch{}).Where("id = ?", batchID).Update("audit_status", audit.Status).Error; err != nil {
		return nil, err
	}

	return &audit, nil
}

func (s *TraceService) GetPublicTrace(code string) (*PublicTraceView, error) {
	var batch model.TeaBatch
	err := s.db.
		Preload("StageRecords", func(db *gorm.DB) *gorm.DB {
			return db.Order("sequence ASC, occurred_at ASC")
		}).
		Where("public_visible = ?", true).
		Where("trace_code = ? OR batch_code = ? OR product_code = ?", code, code, code).
		First(&batch).Error
	if err != nil {
		return nil, err
	}

	var evaluation model.QualityEvaluation
	evaluationErr := s.db.Preload("MetricDetails", func(db *gorm.DB) *gorm.DB {
		return db.Order("id ASC")
	}).Where("batch_id = ?", batch.ID).Order("evaluated_at DESC, id DESC").First(&evaluation).Error

	view := &PublicTraceView{
		Batch: PublicBatchSummary{
			ID:             batch.ID,
			BatchCode:      batch.BatchCode,
			TraceCode:      batch.TraceCode,
			ProductCode:    batch.ProductCode,
			TeaName:        batch.TeaName,
			TeaType:        batch.TeaType,
			Origin:         batch.Origin,
			FarmName:       batch.FarmName,
			EnterpriseName: batch.EnterpriseName,
			QuantityKg:     batch.QuantityKg,
			HarvestDate:    batch.HarvestDate,
			PackagingDate:  batch.PackagingDate,
			AuditStatus:    batch.AuditStatus,
			LatestGrade:    batch.LatestGrade,
		},
		TracePath: batch.StageRecords,
	}

	if evaluationErr == nil {
		view.LatestEvaluation = &QualityEvaluationView{
			Evaluation: evaluation,
			RadarData:  metricDetailsToRadarData(evaluation.MetricDetails),
		}
	}

	return view, nil
}

func normalizeStage(stage string) string {
	return stageAliases[strings.ToLower(strings.TrimSpace(stage))]
}

func buildTraceCode(batchCode string) string {
	normalized := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(batchCode), " ", ""))
	return fmt.Sprintf("TPHK-%s-%d", normalized, time.Now().Unix()%100000)
}

func defaultTeaName(teaName string) string {
	if strings.TrimSpace(teaName) == "" {
		return "太平猴魁"
	}
	return strings.TrimSpace(teaName)
}

func defaultTeaType(teaType string) string {
	if strings.TrimSpace(teaType) == "" {
		return "绿茶"
	}
	return strings.TrimSpace(teaType)
}

func defaultBatchStatus(status string) string {
	switch strings.TrimSpace(status) {
	case model.BatchStatusProcessing, model.BatchStatusCompleted:
		return strings.TrimSpace(status)
	default:
		return model.BatchStatusDraft
	}
}

func defaultAuditStatus(status string) string {
	switch strings.TrimSpace(status) {
	case model.AuditStatusApproved, model.AuditStatusRejected:
		return strings.TrimSpace(status)
	default:
		return model.AuditStatusPending
	}
}

func defaultAuditAction(action string) string {
	if strings.TrimSpace(action) == "" {
		return "review"
	}
	return strings.TrimSpace(action)
}

func applyBatchScope(query *gorm.DB, roleCode, organization string, userID uint) *gorm.DB {
	switch strings.TrimSpace(roleCode) {
	case model.RoleFarmer:
		if strings.TrimSpace(organization) != "" {
			return query.Where("farm_name = ? OR created_by = ?", strings.TrimSpace(organization), userID)
		}
		return query.Where("created_by = ?", userID)
	case model.RoleEnterprise:
		if strings.TrimSpace(organization) != "" {
			return query.Where("enterprise_name = ? OR created_by = ?", strings.TrimSpace(organization), userID)
		}
		return query.Where("created_by = ?", userID)
	default:
		return query
	}
}
