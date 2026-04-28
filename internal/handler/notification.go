package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type NotificationHandler struct {
	notificationService *service.NotificationService
}

func NewNotificationHandler(notificationService *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{notificationService: notificationService}
}

func (h *NotificationHandler) List(c *gin.Context) {
	current := currentOperator(c)

	var isRead *bool
	switch strings.TrimSpace(c.Query("is_read")) {
	case "true":
		value := true
		isRead = &value
	case "false":
		value := false
		isRead = &value
	}

	result, err := h.notificationService.ListNotifications(service.NotificationListFilter{
		UserID:   current.UserID,
		IsRead:   isRead,
		Page:     parseIntDefault(c.Query("page"), 1),
		PageSize: parseIntDefault(c.Query("page_size"), 10),
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, result)
}

func (h *NotificationHandler) MarkRead(c *gin.Context) {
	current := currentOperator(c)
	notificationID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "通知 ID 格式错误")
		return
	}

	item, err := h.notificationService.MarkRead(current.UserID, notificationID)
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Success(c, item)
}

func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	current := currentOperator(c)
	if err := h.notificationService.MarkAllRead(current.UserID); err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, gin.H{"read_all": true})
}

func (h *NotificationHandler) Todos(c *gin.Context) {
	items, err := h.notificationService.GetTodoSummary(currentOperator(c))
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}
