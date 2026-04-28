package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type AdminHandler struct {
	adminService *service.AdminService
}

type rejectRequest struct {
	Reason string `json:"reason"`
}

type processFeedbackRequest struct {
	Status      string `json:"status"`
	ProcessNote string `json:"process_note"`
}

func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.adminService.ListUsers(service.UserListFilter{
		Keyword:        c.Query("keyword"),
		RoleCode:       c.Query("role"),
		Status:         c.Query("status"),
		ApprovalStatus: c.Query("approval_status"),
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	items := make([]service.UserProfile, 0, len(users))
	for _, user := range users {
		u := user
		items = append(items, service.BuildUserProfile(&u))
	}
	responsex.Success(c, items)
}

func (h *AdminHandler) GetUser(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	user, err := h.adminService.GetUser(userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, service.BuildUserProfile(user))
}

func (h *AdminHandler) ListRegistrations(c *gin.Context) {
	users, err := h.adminService.ListRegistrations(c.Query("status"))
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	items := make([]service.UserProfile, 0, len(users))
	for _, user := range users {
		u := user
		items = append(items, service.BuildUserProfile(&u))
	}
	responsex.Success(c, items)
}

func (h *AdminHandler) ApproveRegistration(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	user, err := h.adminService.ApproveRegistration(userID, currentOperator(c).UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, service.BuildUserProfile(user))
}

func (h *AdminHandler) RejectRegistration(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	var request rejectRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "驳回参数格式错误")
		return
	}

	user, err := h.adminService.RejectRegistration(userID, currentOperator(c).UserID, request.Reason)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, service.BuildUserProfile(user))
}

func (h *AdminHandler) EnableUser(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	user, err := h.adminService.EnableUser(userID, currentOperator(c).UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, gin.H{
		"user": service.BuildUserProfile(user),
	})
}

func (h *AdminHandler) DisableUser(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	user, err := h.adminService.DisableUser(userID, currentOperator(c).UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, gin.H{
		"user": service.BuildUserProfile(user),
	})
}

func (h *AdminHandler) ResetPassword(c *gin.Context) {
	userID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "用户 ID 格式错误")
		return
	}

	user, err := h.adminService.ResetPassword(userID, currentOperator(c).UserID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, gin.H{
		"user":               service.BuildUserProfile(user),
		"temporary_password": service.AdminResetPasswordValue,
	})
}

func (h *AdminHandler) ListFeedback(c *gin.Context) {
	items, err := h.adminService.ListFeedback(service.FeedbackListFilter{
		Status: c.Query("status"),
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, items)
}

func (h *AdminHandler) ProcessFeedback(c *gin.Context) {
	feedbackID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "反馈 ID 格式错误")
		return
	}

	var request processFeedbackRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "反馈处理参数格式错误")
		return
	}

	item, err := h.adminService.ProcessFeedback(feedbackID, service.FeedbackProcessInput{
		Status:      request.Status,
		ProcessNote: request.ProcessNote,
		OperatorID:  currentOperator(c).UserID,
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "反馈不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, item)
}

func (h *AdminHandler) ListLogs(c *gin.Context) {
	var actorID *uint
	if raw := c.Query("actor_id"); raw != "" {
		parsed, err := parseUintQuery(raw)
		if err != nil {
			responsex.Fail(c, http.StatusBadRequest, "actor_id 格式错误")
			return
		}
		actorID = &parsed
	}

	result, err := h.adminService.ListOperationLogs(service.OperationLogFilter{
		ActorID:    actorID,
		Action:     c.Query("action"),
		TargetType: c.Query("target_type"),
		Page:       parseIntDefault(c.Query("page"), 1),
		PageSize:   parseIntDefault(c.Query("page_size"), 10),
	})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, result)
}
