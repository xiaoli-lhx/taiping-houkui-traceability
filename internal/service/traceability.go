package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

var ErrAuditRequiresRectificationReview = errors.New("当前批次存在未完成整改任务，请通过整改复审完成闭环后再执行通过审核")
var ErrRectificationResponseRequired = errors.New("整改说明不能为空")

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

var stageRolePermissions = map[string]map[string]struct{}{
	model.RoleFarmer: {
		model.StagePlanting: {},
		model.StagePicking:  {},
	},
	model.RoleEnterprise: {
		model.StageProcessing:   {},
		model.StagePackaging:    {},
		model.StageDistribution: {},
	},
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

type RectificationListFilter struct {
	Status   string
	Operator OperatorContext
}

type RectificationSubmitInput struct {
	ResponseComment string
}

type RectificationReviewInput struct {
	Status          string
	ReviewerComment string
}

type PublicBatchSummary struct {
	ID                  uint       `json:"id"`
	BatchCode           string     `json:"batch_code"`
	TraceCode           string     `json:"trace_code"`
	ProductCode         string     `json:"product_code"`
	TeaName             string     `json:"tea_name"`
	TeaType             string     `json:"tea_type"`
	Origin              string     `json:"origin"`
	FarmName            string     `json:"farm_name"`
	EnterpriseName      string     `json:"enterprise_name"`
	QuantityKg          float64    `json:"quantity_kg"`
	HarvestDate         *time.Time `json:"harvest_date,omitempty"`
	PackagingDate       *time.Time `json:"packaging_date,omitempty"`
	AuditStatus         string     `json:"audit_status"`
	RectificationStatus string     `json:"rectification_status"`
	LatestGrade         string     `json:"latest_grade"`
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
	if operator.PrimaryRole() != model.RoleEnterprise {
		return nil, errors.New("当前角色无权创建批次")
	}

	batch := model.TeaBatch{
		BatchCode:           strings.TrimSpace(input.BatchCode),
		TraceCode:           strings.TrimSpace(input.TraceCode),
		ProductCode:         strings.TrimSpace(input.ProductCode),
		TeaName:             defaultTeaName(input.TeaName),
		TeaType:             defaultTeaType(input.TeaType),
		Origin:              strings.TrimSpace(input.Origin),
		FarmName:            strings.TrimSpace(input.FarmName),
		EnterpriseName:      strings.TrimSpace(defaultOrganization(input.EnterpriseName, operator.OrganizationName())),
		QuantityKg:          round2(input.QuantityKg),
		HarvestDate:         input.HarvestDate,
		PackagingDate:       input.PackagingDate,
		Status:              defaultBatchStatus(input.Status),
		AuditStatus:         model.AuditStatusPending,
		RectificationStatus: model.RectificationStatusNone,
		PublicVisible:       input.PublicVisible,
		Notes:               strings.TrimSpace(input.Notes),
		CreatedBy:           operator.UserID,
	}

	if batch.TraceCode == "" {
		batch.TraceCode = buildTraceCode(batch.BatchCode)
	}

	if err := s.db.Create(&batch).Error; err != nil {
		return nil, err
	}

	return &batch, nil
}

func (s *TraceService) UpdateBatch(id uint, input BatchUpsertInput, operator OperatorContext) (*model.TeaBatch, error) {
	if operator.PrimaryRole() != model.RoleEnterprise {
		return nil, errors.New("当前角色无权修改批次")
	}

	var batch model.TeaBatch
	if err := s.db.First(&batch, id).Error; err != nil {
		return nil, err
	}
	if !s.CanAccessBatch(&batch, operator) {
		return nil, errors.New("当前账号无权修改该批次")
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
	batch.EnterpriseName = strings.TrimSpace(defaultOrganization(input.EnterpriseName, operator.OrganizationName()))
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
		Preload("RectificationTasks", func(db *gorm.DB) *gorm.DB {
			return db.Order("updated_at DESC, id DESC")
		}).
		Preload("RectificationTasks.StageRecord").
		Preload("RectificationTasks.SourceAudit").
		First(&batch, id).Error; err != nil {
		return nil, err
	}

	return &batch, nil
}

func (s *TraceService) CreateStage(batchID uint, input StageUpsertInput, operator OperatorContext) (*model.TraceStageRecord, error) {
	var batch model.TeaBatch
	if err := s.db.First(&batch, batchID).Error; err != nil {
		return nil, err
	}
	if !s.CanAccessBatch(&batch, operator) {
		return nil, errors.New("当前账号无权为该批次新增阶段")
	}

	stageName := normalizeStage(input.Stage)
	if stageName == "" {
		return nil, fmt.Errorf("阶段类型不合法")
	}
	if !canManageStage(operator.PrimaryRole(), stageName) {
		return nil, errors.New("当前角色无权维护该阶段")
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

	var batch model.TeaBatch
	if err := s.db.First(&batch, stage.BatchID).Error; err != nil {
		return nil, err
	}
	if !s.CanAccessBatch(&batch, operator) {
		return nil, errors.New("当前账号无权修改该阶段")
	}

	stageName := normalizeStage(input.Stage)
	if stageName == "" {
		return nil, fmt.Errorf("阶段类型不合法")
	}
	if !canManageStage(operator.PrimaryRole(), stage.Stage) || !canManageStage(operator.PrimaryRole(), stageName) {
		return nil, errors.New("当前角色无权维护该阶段")
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

func (s *TraceService) DeleteStage(id uint, operator OperatorContext) error {
	var stage model.TraceStageRecord
	if err := s.db.First(&stage, id).Error; err != nil {
		return err
	}

	var batch model.TeaBatch
	if err := s.db.First(&batch, stage.BatchID).Error; err != nil {
		return err
	}
	if !s.CanAccessBatch(&batch, operator) {
		return errors.New("当前账号无权删除该阶段")
	}
	if !canManageStage(operator.PrimaryRole(), stage.Stage) {
		return errors.New("当前角色无权删除该阶段")
	}

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
	if operator.PrimaryRole() != model.RoleRegulator {
		return nil, errors.New("当前角色无权执行审核")
	}

	var batch model.TeaBatch
	if err := s.db.First(&batch, batchID).Error; err != nil {
		return nil, err
	}

	var stage *model.TraceStageRecord
	if input.StageRecordID != nil {
		item := &model.TraceStageRecord{}
		if err := s.db.First(item, *input.StageRecordID).Error; err != nil {
			return nil, err
		}
		if item.BatchID != batchID {
			return nil, fmt.Errorf("审核阶段记录与批次不匹配")
		}
		stage = item
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

	if audit.Status == model.AuditStatusApproved {
		hasOpenRectification, err := s.hasOpenRectificationTask(batchID)
		if err != nil {
			return nil, err
		}
		if shouldBlockApprovalForOpenRectification(audit.Status, hasOpenRectification) {
			return nil, ErrAuditRequiresRectificationReview
		}
	}

	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}
		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    operator.UserID,
			ActorRole:  operator.PrimaryRole(),
			Action:     "create_audit",
			TargetType: model.LogTargetAuditRecord,
			TargetID:   audit.ID,
			Summary:    "监管方提交了审核记录",
			Detail: map[string]any{
				"batch_id": batchID,
				"status":   audit.Status,
				"action":   audit.Action,
			},
		}); err != nil {
			return err
		}

		batchUpdates := map[string]any{
			"audit_status": audit.Status,
		}
		if audit.Status == model.AuditStatusRejected {
			batchUpdates["rectification_status"] = model.RectificationStatusPendingSubmission
		}
		if err := tx.Model(&model.TeaBatch{}).Where("id = ?", batchID).Updates(batchUpdates).Error; err != nil {
			return err
		}

		if audit.Status == model.AuditStatusRejected {
			task, err := s.createOrOverwriteRectificationTaskTx(tx, batchID, stage, &audit)
			if err != nil {
				return err
			}
			notifications, err := s.buildRectificationTaskNotificationsTx(tx, task, &batch)
			if err != nil {
				return err
			}
			if err := createNotificationsTx(tx, notifications); err != nil {
				return err
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return &audit, nil
}

func (s *TraceService) ListRectifications(filter RectificationListFilter) ([]model.RectificationTask, error) {
	query := s.db.
		Preload("Batch").
		Preload("StageRecord").
		Preload("SourceAudit").
		Model(&model.RectificationTask{})
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
	}
	if role := filter.Operator.PrimaryRole(); role == model.RoleFarmer || role == model.RoleEnterprise {
		query = query.Where("responsible_role = ?", role)
	}

	var tasks []model.RectificationTask
	if err := query.Order("updated_at DESC, id DESC").Find(&tasks).Error; err != nil {
		return nil, err
	}

	if role := filter.Operator.PrimaryRole(); role == model.RoleFarmer || role == model.RoleEnterprise {
		filtered := make([]model.RectificationTask, 0, len(tasks))
		for _, task := range tasks {
			if task.Batch != nil && s.CanAccessBatch(task.Batch, filter.Operator) {
				filtered = append(filtered, task)
			}
		}
		return filtered, nil
	}

	return tasks, nil
}

func (s *TraceService) SubmitRectification(id uint, input RectificationSubmitInput, operator OperatorContext) (*model.RectificationTask, error) {
	task, err := s.getRectificationTask(id)
	if err != nil {
		return nil, err
	}
	if task.Batch == nil || !s.CanAccessBatch(task.Batch, operator) {
		return nil, errors.New("当前账号无权提交该整改任务")
	}
	if operator.PrimaryRole() != task.ResponsibleRole {
		return nil, errors.New("当前角色无权提交该整改任务")
	}
	if task.Status != model.RectificationStatusPendingSubmission {
		return nil, errors.New("当前整改任务不处于待提交状态")
	}
	if err := validateRectificationResponse(input.ResponseComment); err != nil {
		return nil, err
	}

	now := time.Now()
	err = s.db.Transaction(func(tx *gorm.DB) error {
		taskUpdates := map[string]any{
			"status":           model.RectificationStatusSubmitted,
			"response_comment": strings.TrimSpace(input.ResponseComment),
			"submitted_by":     &operator.UserID,
			"submitted_at":     &now,
		}
		if err := tx.Model(&model.RectificationTask{}).Where("id = ?", id).Updates(taskUpdates).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.TeaBatch{}).Where("id = ?", task.BatchID).Updates(map[string]any{
			"rectification_status": model.RectificationStatusSubmitted,
			"audit_status":         model.AuditStatusPending,
		}).Error; err != nil {
			return err
		}
		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    operator.UserID,
			ActorRole:  operator.PrimaryRole(),
			Action:     "submit_rectification",
			TargetType: model.LogTargetRectificationTask,
			TargetID:   id,
			Summary:    "提交了整改说明",
			Detail: map[string]any{
				"batch_id": task.BatchID,
			},
		}); err != nil {
			return err
		}
		regulators, err := findUsersByRoleAndOrganization(tx, model.RoleRegulator, "")
		if err != nil {
			return err
		}
		notifications := make([]NotificationCreateInput, 0, len(regulators))
		for _, regulator := range regulators {
			notifications = append(notifications, NotificationCreateInput{
				UserID:   regulator.ID,
				Category: model.NotificationCategoryRectificationReview,
				Title:    "有新的整改任务待复审",
				Content:  fmt.Sprintf("批次 %d 的整改说明已提交，请尽快复审。", task.BatchID),
				Link:     "/regulator/reviews",
			})
		}
		return createNotificationsTx(tx, notifications)
	})
	if err != nil {
		return nil, err
	}

	return s.getRectificationTask(id)
}

func (s *TraceService) ReviewRectification(id uint, input RectificationReviewInput, operator OperatorContext) (*model.RectificationTask, error) {
	if operator.PrimaryRole() != model.RoleRegulator {
		return nil, errors.New("当前角色无权复审整改任务")
	}

	task, err := s.getRectificationTask(id)
	if err != nil {
		return nil, err
	}
	if task.Status != model.RectificationStatusSubmitted {
		return nil, errors.New("当前整改任务不处于待复审状态")
	}

	status := defaultAuditStatus(input.Status)
	if status != model.AuditStatusApproved && status != model.AuditStatusRejected {
		return nil, errors.New("整改复审状态不合法")
	}

	now := time.Now()
	err = s.db.Transaction(func(tx *gorm.DB) error {
		taskUpdates := map[string]any{
			"reviewer_comment": strings.TrimSpace(input.ReviewerComment),
			"reviewed_by":      &operator.UserID,
			"reviewed_at":      &now,
		}
		batchUpdates := map[string]any{}
		if status == model.AuditStatusApproved {
			taskUpdates["status"] = model.RectificationStatusCompleted
			batchUpdates["rectification_status"] = model.RectificationStatusCompleted
			batchUpdates["audit_status"] = model.AuditStatusApproved
		} else {
			taskUpdates["status"] = model.RectificationStatusPendingSubmission
			batchUpdates["rectification_status"] = model.RectificationStatusPendingSubmission
			batchUpdates["audit_status"] = model.AuditStatusRejected
		}

		if err := tx.Model(&model.RectificationTask{}).Where("id = ?", id).Updates(taskUpdates).Error; err != nil {
			return err
		}
		if err := tx.Model(&model.TeaBatch{}).Where("id = ?", task.BatchID).Updates(batchUpdates).Error; err != nil {
			return err
		}

		audit := model.AuditRecord{
			BatchID:       task.BatchID,
			StageRecordID: task.StageRecordID,
			ReviewerID:    operator.UserID,
			ReviewerName:  operator.Name(),
			Action:        "rectification_review",
			Status:        status,
			Comment:       strings.TrimSpace(input.ReviewerComment),
			ReviewedAt:    now,
		}
		if err := tx.Create(&audit).Error; err != nil {
			return err
		}
		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    operator.UserID,
			ActorRole:  operator.PrimaryRole(),
			Action:     "review_rectification",
			TargetType: model.LogTargetRectificationTask,
			TargetID:   id,
			Summary:    "监管方提交了整改复审结果",
			Detail: map[string]any{
				"status": status,
			},
		}); err != nil {
			return err
		}

		notifications, err := s.buildRectificationReviewNotificationsTx(tx, task, status)
		if err != nil {
			return err
		}
		return createNotificationsTx(tx, notifications)
	})
	if err != nil {
		return nil, err
	}

	return s.getRectificationTask(id)
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
			ID:                  batch.ID,
			BatchCode:           batch.BatchCode,
			TraceCode:           batch.TraceCode,
			ProductCode:         batch.ProductCode,
			TeaName:             batch.TeaName,
			TeaType:             batch.TeaType,
			Origin:              batch.Origin,
			FarmName:            batch.FarmName,
			EnterpriseName:      batch.EnterpriseName,
			QuantityKg:          batch.QuantityKg,
			HarvestDate:         batch.HarvestDate,
			PackagingDate:       batch.PackagingDate,
			AuditStatus:         batch.AuditStatus,
			RectificationStatus: batch.RectificationStatus,
			LatestGrade:         batch.LatestGrade,
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

func (s *TraceService) getRectificationTask(id uint) (*model.RectificationTask, error) {
	var task model.RectificationTask
	if err := s.db.
		Preload("Batch").
		Preload("StageRecord").
		Preload("SourceAudit").
		First(&task, id).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func (s *TraceService) hasOpenRectificationTask(batchID uint) (bool, error) {
	var count int64
	if err := s.db.Model(&model.RectificationTask{}).
		Where("batch_id = ? AND status IN ?", batchID, []string{model.RectificationStatusPendingSubmission, model.RectificationStatusSubmitted}).
		Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *TraceService) createOrOverwriteRectificationTaskTx(tx *gorm.DB, batchID uint, stage *model.TraceStageRecord, audit *model.AuditRecord) (*model.RectificationTask, error) {
	responsibleRole := model.RoleEnterprise
	if stage != nil && (stage.Stage == model.StagePlanting || stage.Stage == model.StagePicking) {
		responsibleRole = model.RoleFarmer
	}

	issueSummary := strings.TrimSpace(audit.Comment)
	if issueSummary == "" {
		issueSummary = "监管审核未通过，需要补充整改说明。"
	}
	requiredAction := buildRequiredAction(stage, responsibleRole)

	var existing model.RectificationTask
	err := tx.Where("batch_id = ? AND status <> ?", batchID, model.RectificationStatusCompleted).
		Order("updated_at DESC, id DESC").
		First(&existing).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	if existing.ID != 0 {
		updates := map[string]any{
			"stage_record_id":  stageRecordID(stage),
			"source_audit_id":  audit.ID,
			"responsible_role": responsibleRole,
			"status":           model.RectificationStatusPendingSubmission,
			"issue_summary":    issueSummary,
			"required_action":  requiredAction,
			"response_comment": "",
			"reviewer_comment": strings.TrimSpace(audit.Comment),
			"submitted_by":     nil,
			"submitted_at":     nil,
			"reviewed_by":      nil,
			"reviewed_at":      nil,
		}
		if err := tx.Model(&model.RectificationTask{}).Where("id = ?", existing.ID).Updates(updates).Error; err != nil {
			return nil, err
		}
		existing.StageRecordID = stageRecordID(stage)
		existing.SourceAuditID = audit.ID
		existing.ResponsibleRole = responsibleRole
		existing.Status = model.RectificationStatusPendingSubmission
		existing.IssueSummary = issueSummary
		existing.RequiredAction = requiredAction
		existing.ResponseComment = ""
		existing.ReviewerComment = strings.TrimSpace(audit.Comment)
		existing.SubmittedBy = nil
		existing.SubmittedAt = nil
		existing.ReviewedBy = nil
		existing.ReviewedAt = nil
		return &existing, nil
	}

	task := model.RectificationTask{
		BatchID:         batchID,
		StageRecordID:   stageRecordID(stage),
		SourceAuditID:   audit.ID,
		ResponsibleRole: responsibleRole,
		Status:          model.RectificationStatusPendingSubmission,
		IssueSummary:    issueSummary,
		RequiredAction:  requiredAction,
		ReviewerComment: strings.TrimSpace(audit.Comment),
	}
	if err := tx.Create(&task).Error; err != nil {
		return nil, err
	}
	return &task, nil
}

func normalizeStage(stage string) string {
	return stageAliases[strings.ToLower(strings.TrimSpace(stage))]
}

func canManageStage(roleCode, stage string) bool {
	allowedStages, ok := stageRolePermissions[strings.TrimSpace(roleCode)]
	if !ok {
		return false
	}
	_, allowed := allowedStages[strings.TrimSpace(stage)]
	return allowed
}

func stageRecordID(stage *model.TraceStageRecord) *uint {
	if stage == nil {
		return nil
	}
	return &stage.ID
}

func buildRequiredAction(stage *model.TraceStageRecord, responsibleRole string) string {
	if stage != nil {
		return fmt.Sprintf("请围绕阶段“%s”补充整改说明，并重新提交复审。", stage.Title)
	}
	if responsibleRole == model.RoleFarmer {
		return "请补充种植或采摘环节的整改说明，并重新提交复审。"
	}
	return "请补充批次主信息或加工流通环节的整改说明，并重新提交复审。"
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

func defaultOrganization(inputValue, fallback string) string {
	if strings.TrimSpace(inputValue) != "" {
		return strings.TrimSpace(inputValue)
	}
	return strings.TrimSpace(fallback)
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

func (s *TraceService) buildRectificationTaskNotificationsTx(tx *gorm.DB, task *model.RectificationTask, batch *model.TeaBatch) ([]NotificationCreateInput, error) {
	organization := batch.EnterpriseName
	link := "/enterprise/rectifications"
	if task.ResponsibleRole == model.RoleFarmer {
		organization = batch.FarmName
		link = "/farmer/rectifications"
	}

	recipients, err := findUsersByRoleAndOrganization(tx, task.ResponsibleRole, organization)
	if err != nil {
		return nil, err
	}
	if len(recipients) == 0 && batch.CreatedBy != 0 && task.ResponsibleRole == model.RoleEnterprise {
		var createdBy model.User
		if err := tx.First(&createdBy, batch.CreatedBy).Error; err == nil {
			recipients = append(recipients, createdBy)
		}
	}

	notifications := make([]NotificationCreateInput, 0, len(recipients))
	for _, recipient := range recipients {
		notifications = append(notifications, NotificationCreateInput{
			UserID:   recipient.ID,
			Category: model.NotificationCategoryRectificationTask,
			Title:    "收到新的整改任务",
			Content:  fmt.Sprintf("批次 %s 被驳回，请根据整改要求补充说明后重新提交。", batch.BatchCode),
			Link:     link,
		})
	}
	return notifications, nil
}

func (s *TraceService) buildRectificationReviewNotificationsTx(tx *gorm.DB, task *model.RectificationTask, status string) ([]NotificationCreateInput, error) {
	var batch model.TeaBatch
	if err := tx.First(&batch, task.BatchID).Error; err != nil {
		return nil, err
	}

	organization := batch.EnterpriseName
	link := "/enterprise/rectifications"
	if task.ResponsibleRole == model.RoleFarmer {
		organization = batch.FarmName
		link = "/farmer/rectifications"
	}

	recipients, err := findUsersByRoleAndOrganization(tx, task.ResponsibleRole, organization)
	if err != nil {
		return nil, err
	}
	notifications := make([]NotificationCreateInput, 0, len(recipients))
	for _, recipient := range recipients {
		title := "整改复审未通过"
		content := fmt.Sprintf("批次 %s 的整改复审未通过，请根据最新意见继续整改。", batch.BatchCode)
		if status == model.AuditStatusApproved {
			title = "整改复审已通过"
			content = fmt.Sprintf("批次 %s 的整改复审已通过。", batch.BatchCode)
		}
		notifications = append(notifications, NotificationCreateInput{
			UserID:   recipient.ID,
			Category: model.NotificationCategoryRectificationReview,
			Title:    title,
			Content:  content,
			Link:     link,
		})
	}
	return notifications, nil
}

func validateRectificationResponse(responseComment string) error {
	if strings.TrimSpace(responseComment) == "" {
		return ErrRectificationResponseRequired
	}
	return nil
}

func shouldBlockApprovalForOpenRectification(auditStatus string, hasOpenRectification bool) bool {
	return defaultAuditStatus(auditStatus) == model.AuditStatusApproved && hasOpenRectification
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
