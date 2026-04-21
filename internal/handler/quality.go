package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type QualityHandler struct {
	qualityService *service.QualityService
}

type createEvaluationRequest struct {
	BatchID     uint                  `json:"batch_id"`
	RuleVersion string                `json:"rule_version"`
	Summary     string                `json:"summary"`
	Metrics     []service.MetricInput `json:"metrics"`
	EvaluatedAt string                `json:"evaluated_at"`
}

func NewQualityHandler(qualityService *service.QualityService) *QualityHandler {
	return &QualityHandler{qualityService: qualityService}
}

func (h *QualityHandler) CreateEvaluation(c *gin.Context) {
	var request createEvaluationRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "品质评估参数格式错误")
		return
	}
	if request.BatchID == 0 || len(request.Metrics) == 0 {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 和指标列表不能为空")
		return
	}

	evaluatedAt, err := parseFlexibleTime(request.EvaluatedAt)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "评估时间格式错误")
		return
	}

	view, err := h.qualityService.CreateEvaluation(service.CreateQualityEvaluationInput{
		BatchID:     request.BatchID,
		EvaluatorID: currentOperator(c).UserID,
		RuleVersion: request.RuleVersion,
		Summary:     request.Summary,
		Metrics:     request.Metrics,
		EvaluatedAt: evaluatedAt,
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		if errors.Is(err, service.ErrInvalidMetrics) {
			responsex.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Created(c, view)
}

func (h *QualityHandler) GetEvaluation(c *gin.Context) {
	id, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "评估 ID 格式错误")
		return
	}

	view, err := h.qualityService.GetEvaluation(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "评估记录不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, view)
}

func (h *QualityHandler) GetLatestByBatch(c *gin.Context) {
	batchID, err := parseUintParam(c, "batchID")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "批次 ID 格式错误")
		return
	}

	view, err := h.qualityService.GetLatestByBatch(batchID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "当前批次暂无品质评估记录")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, view)
}
