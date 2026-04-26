package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type TraceHandler struct {
	traceService *service.TraceService
}

type batchRequest struct {
	BatchCode      string  `json:"batch_code"`
	TraceCode      string  `json:"trace_code"`
	ProductCode    string  `json:"product_code"`
	TeaName        string  `json:"tea_name"`
	TeaType        string  `json:"tea_type"`
	Origin         string  `json:"origin"`
	FarmName       string  `json:"farm_name"`
	EnterpriseName string  `json:"enterprise_name"`
	QuantityKg     float64 `json:"quantity_kg"`
	HarvestDate    string  `json:"harvest_date"`
	PackagingDate  string  `json:"packaging_date"`
	Status         string  `json:"status"`
	PublicVisible  bool    `json:"public_visible"`
	Notes          string  `json:"notes"`
}

type stageRequest struct {
	Stage       string `json:"stage"`
	Sequence    int    `json:"sequence"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Location    string `json:"location"`
	OccurredAt  string `json:"occurred_at"`
}

type auditRequest struct {
	StageRecordID *uint  `json:"stage_record_id"`
	Action        string `json:"action"`
	Status        string `json:"status"`
	Comment       string `json:"comment"`
}

type rectificationSubmitRequest struct {
	ResponseComment string `json:"response_comment"`
}

type rectificationReviewRequest struct {
	Status          string `json:"status"`
	ReviewerComment string `json:"reviewer_comment"`
}

func NewTraceHandler(traceService *service.TraceService) *TraceHandler {
	return &TraceHandler{traceService: traceService}
}

func (h *TraceHandler) ListBatches(c *gin.Context) {
	operator := currentOperator(c)
	items, total, err := h.traceService.ListBatches(service.BatchListFilter{
		Keyword:     c.Query("keyword"),
		Status:      c.Query("status"),
		AuditStatus: c.Query("audit_status"),
		Origin:      c.Query("origin"),
		Page:        parseIntDefault(c.Query("page"), 1),
		PageSize:    parseIntDefault(c.Query("page_size"), 10),
		ViewerID:    operator.UserID,
		ViewerRole:  operator.PrimaryRole(),
		ViewerOrg:   operator.Organization,
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, gin.H{
		"items": items,
		"pagination": gin.H{
			"page":      parseIntDefault(c.Query("page"), 1),
			"page_size": parseIntDefault(c.Query("page_size"), 10),
			"total":     total,
		},
	})
}

func (h *TraceHandler) CreateBatch(c *gin.Context) {
	var request batchRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次参数格式错误")
		return
	}
	if !validateBatchRequest(request) {
		responsex.Fail(c, http.StatusBadRequest, "批次码、产品编号、产地、茶园主体不能为空")
		return
	}

	harvestDate, err := parseFlexibleTime(request.HarvestDate)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "采摘日期格式错误，支持 YYYY-MM-DD 或 RFC3339")
		return
	}
	packagingDate, err := parseFlexibleTime(request.PackagingDate)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "包装日期格式错误，支持 YYYY-MM-DD 或 RFC3339")
		return
	}

	batch, err := h.traceService.CreateBatch(service.BatchUpsertInput{
		BatchCode:      request.BatchCode,
		TraceCode:      request.TraceCode,
		ProductCode:    request.ProductCode,
		TeaName:        request.TeaName,
		TeaType:        request.TeaType,
		Origin:         request.Origin,
		FarmName:       request.FarmName,
		EnterpriseName: request.EnterpriseName,
		QuantityKg:     request.QuantityKg,
		HarvestDate:    harvestDate,
		PackagingDate:  packagingDate,
		Status:         request.Status,
		PublicVisible:  request.PublicVisible,
		Notes:          request.Notes,
	}, currentOperator(c))
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Created(c, batch)
}

func (h *TraceHandler) GetBatch(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	batch, err := h.traceService.GetBatch(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	if !h.traceService.CanAccessBatch(batch, currentOperator(c)) {
		responsex.Fail(c, http.StatusForbidden, "当前账号无权查看该批次")
		return
	}

	responsex.Success(c, batch)
}

func (h *TraceHandler) UpdateBatch(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	var request batchRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次参数格式错误")
		return
	}
	if !validateBatchRequest(request) {
		responsex.Fail(c, http.StatusBadRequest, "批次码、产品编号、产地、茶园主体不能为空")
		return
	}

	harvestDate, err := parseFlexibleTime(request.HarvestDate)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "采摘日期格式错误")
		return
	}
	packagingDate, err := parseFlexibleTime(request.PackagingDate)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "包装日期格式错误")
		return
	}

	batch, err := h.traceService.UpdateBatch(id, service.BatchUpsertInput{
		BatchCode:      request.BatchCode,
		TraceCode:      request.TraceCode,
		ProductCode:    request.ProductCode,
		TeaName:        request.TeaName,
		TeaType:        request.TeaType,
		Origin:         request.Origin,
		FarmName:       request.FarmName,
		EnterpriseName: request.EnterpriseName,
		QuantityKg:     request.QuantityKg,
		HarvestDate:    harvestDate,
		PackagingDate:  packagingDate,
		Status:         request.Status,
		PublicVisible:  request.PublicVisible,
		Notes:          request.Notes,
	}, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, batch)
}

func (h *TraceHandler) CreateStage(c *gin.Context) {
	batchID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	var request stageRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段参数格式错误")
		return
	}
	if strings.TrimSpace(request.Stage) == "" || strings.TrimSpace(request.Title) == "" {
		responsex.Fail(c, http.StatusBadRequest, "阶段类型和标题不能为空")
		return
	}

	occurredAt, err := parseFlexibleTime(request.OccurredAt)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段时间格式错误")
		return
	}

	input := service.StageUpsertInput{
		Stage:       request.Stage,
		Sequence:    request.Sequence,
		Title:       request.Title,
		Description: request.Description,
		Location:    request.Location,
	}
	if occurredAt != nil {
		input.OccurredAt = *occurredAt
	}

	stage, err := h.traceService.CreateStage(batchID, input, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Created(c, stage)
}

func (h *TraceHandler) UpdateStage(c *gin.Context) {
	stageID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段记录 ID 格式错误")
		return
	}

	var request stageRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段参数格式错误")
		return
	}
	if strings.TrimSpace(request.Stage) == "" || strings.TrimSpace(request.Title) == "" {
		responsex.Fail(c, http.StatusBadRequest, "阶段类型和标题不能为空")
		return
	}

	occurredAt, err := parseFlexibleTime(request.OccurredAt)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段时间格式错误")
		return
	}

	input := service.StageUpsertInput{
		Stage:       request.Stage,
		Sequence:    request.Sequence,
		Title:       request.Title,
		Description: request.Description,
		Location:    request.Location,
	}
	if occurredAt != nil {
		input.OccurredAt = *occurredAt
	}

	stage, err := h.traceService.UpdateStage(stageID, input, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "阶段记录不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, stage)
}

func (h *TraceHandler) DeleteStage(c *gin.Context) {
	stageID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "阶段记录 ID 格式错误")
		return
	}

	if err := h.traceService.DeleteStage(stageID, currentOperator(c)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "阶段记录不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, gin.H{"deleted": true})
}

func (h *TraceHandler) ListAudits(c *gin.Context) {
	batchID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	records, err := h.traceService.ListAudits(batchID)
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	batch, err := h.traceService.GetBatch(batchID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	if !h.traceService.CanAccessBatch(batch, currentOperator(c)) {
		responsex.Fail(c, http.StatusForbidden, "当前账号无权查看该批次审核记录")
		return
	}

	responsex.Success(c, records)
}

func (h *TraceHandler) CreateAudit(c *gin.Context) {
	batchID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	var request auditRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "审核参数格式错误")
		return
	}
	if strings.TrimSpace(request.Status) == "" {
		responsex.Fail(c, http.StatusBadRequest, "审核状态不能为空")
		return
	}

	record, err := h.traceService.CreateAudit(batchID, service.AuditInput{
		StageRecordID: request.StageRecordID,
		Action:        request.Action,
		Status:        request.Status,
		Comment:       request.Comment,
	}, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次或阶段记录不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Created(c, record)
}

func (h *TraceHandler) ListRectifications(c *gin.Context) {
	items, err := h.traceService.ListRectifications(service.RectificationListFilter{
		Status:   c.Query("status"),
		Operator: currentOperator(c),
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, items)
}

func (h *TraceHandler) SubmitRectification(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "整改任务 ID 格式错误")
		return
	}

	var request rectificationSubmitRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "整改提交参数格式错误")
		return
	}

	item, err := h.traceService.SubmitRectification(taskID, service.RectificationSubmitInput{
		ResponseComment: request.ResponseComment,
	}, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "整改任务不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, item)
}

func (h *TraceHandler) ReviewRectification(c *gin.Context) {
	taskID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "整改任务 ID 格式错误")
		return
	}

	var request rectificationReviewRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "整改复审参数格式错误")
		return
	}
	if strings.TrimSpace(request.Status) == "" {
		responsex.Fail(c, http.StatusBadRequest, "整改复审状态不能为空")
		return
	}

	item, err := h.traceService.ReviewRectification(taskID, service.RectificationReviewInput{
		Status:          request.Status,
		ReviewerComment: request.ReviewerComment,
	}, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "整改任务不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, item)
}

func validateBatchRequest(request batchRequest) bool {
	return strings.TrimSpace(request.BatchCode) != "" &&
		strings.TrimSpace(request.ProductCode) != "" &&
		strings.TrimSpace(request.Origin) != "" &&
		strings.TrimSpace(request.FarmName) != ""
}
