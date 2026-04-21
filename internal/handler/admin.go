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

func NewAdminHandler(adminService *service.AdminService) *AdminHandler {
	return &AdminHandler{adminService: adminService}
}

func (h *AdminHandler) ListUsers(c *gin.Context) {
	users, err := h.adminService.ListUsers(service.UserListFilter{
		Keyword:        c.Query("keyword"),
		RoleCode:       c.Query("role"),
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

	users, err := h.adminService.ListUsers(service.UserListFilter{})
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	for _, user := range users {
		if user.ID == userID {
			u := user
			responsex.Success(c, service.BuildUserProfile(&u))
			return
		}
	}

	responsex.Fail(c, http.StatusNotFound, "用户不存在")
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
