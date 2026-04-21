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

type ConsumerHandler struct {
	consumerService *service.ConsumerService
}

type favoriteRequest struct {
	BatchID uint `json:"batch_id"`
}

type feedbackRequest struct {
	BatchID     *uint  `json:"batch_id"`
	TraceCode   string `json:"trace_code"`
	Content     string `json:"content"`
	ContactInfo string `json:"contact_info"`
}

type historyRequest struct {
	Code string `json:"code"`
}

func NewConsumerHandler(consumerService *service.ConsumerService) *ConsumerHandler {
	return &ConsumerHandler{consumerService: consumerService}
}

func (h *ConsumerHandler) CreateFavorite(c *gin.Context) {
	var request favoriteRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "收藏参数格式错误")
		return
	}

	item, err := h.consumerService.CreateFavorite(service.CreateFavoriteInput{
		UserID:  currentOperator(c).UserID,
		BatchID: request.BatchID,
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "批次不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Created(c, item)
}

func (h *ConsumerHandler) ListFavorites(c *gin.Context) {
	items, err := h.consumerService.ListFavorites(currentOperator(c).UserID)
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *ConsumerHandler) CreateFeedback(c *gin.Context) {
	var request feedbackRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "反馈参数格式错误")
		return
	}
	if strings.TrimSpace(request.Content) == "" {
		responsex.Fail(c, http.StatusBadRequest, "反馈内容不能为空")
		return
	}

	item, err := h.consumerService.CreateFeedback(service.CreateFeedbackInput{
		UserID:      currentOperator(c).UserID,
		BatchID:     request.BatchID,
		TraceCode:   request.TraceCode,
		Content:     request.Content,
		ContactInfo: request.ContactInfo,
	})
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Created(c, item)
}

func (h *ConsumerHandler) ListHistory(c *gin.Context) {
	items, err := h.consumerService.ListHistory(currentOperator(c).UserID)
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *ConsumerHandler) CreateHistory(c *gin.Context) {
	var request historyRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "历史参数格式错误")
		return
	}
	if strings.TrimSpace(request.Code) == "" {
		responsex.Fail(c, http.StatusBadRequest, "查询码不能为空")
		return
	}

	item, err := h.consumerService.CreateHistory(service.CreateHistoryInput{
		UserID: currentOperator(c).UserID,
		Code:   request.Code,
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "未查询到公开溯源信息")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Created(c, item)
}
