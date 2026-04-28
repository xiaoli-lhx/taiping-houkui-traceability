package handler

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/middleware"
	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type AuthHandler struct {
	authService *service.AuthService
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type registerRequest struct {
	Username        string `json:"username"`
	Password        string `json:"password"`
	ConfirmPassword string `json:"confirm_password"`
	DisplayName     string `json:"display_name"`
	Phone           string `json:"phone"`
	Organization    string `json:"organization"`
	ContactInfo     string `json:"contact_info"`
	Role            string `json:"role"`
}

type registrationStatusRequest struct {
	Username string `form:"username"`
}

type changePasswordRequest struct {
	OldPassword     string `json:"old_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

func NewAuthHandler(authService *service.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var request loginRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "登录参数格式错误")
		return
	}

	result, err := h.authService.Login(request.Username, request.Password, request.Role)
	if err != nil {
		if errors.Is(err, service.ErrInvalidCredentials) ||
			errors.Is(err, service.ErrPendingApproval) ||
			errors.Is(err, service.ErrRejectedApproval) ||
			errors.Is(err, service.ErrDisabledAccount) {
			responsex.Fail(c, http.StatusUnauthorized, err.Error())
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, result)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var request registerRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "注册参数格式错误")
		return
	}

	user, err := h.authService.Register(service.RegisterInput{
		Username:        request.Username,
		Password:        request.Password,
		ConfirmPassword: request.ConfirmPassword,
		DisplayName:     request.DisplayName,
		Phone:           request.Phone,
		Organization:    request.Organization,
		ContactInfo:     request.ContactInfo,
		RoleCode:        request.Role,
	})
	if err != nil {
		if errors.Is(err, service.ErrUsernameExists) ||
			errors.Is(err, service.ErrRoleNotAllowed) ||
			errors.Is(err, service.ErrPasswordMismatch) {
			responsex.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Created(c, service.BuildUserProfile(user))
}

func (h *AuthHandler) Me(c *gin.Context) {
	current := middleware.GetCurrentUser(c)
	user, err := h.authService.GetUserByID(current.ID)
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

func (h *AuthHandler) RegistrationStatus(c *gin.Context) {
	var request registrationStatusRequest
	if err := c.ShouldBindQuery(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "查询参数格式错误")
		return
	}
	if request.Username == "" {
		responsex.Fail(c, http.StatusBadRequest, "username 不能为空")
		return
	}

	user, err := h.authService.GetUserByUsername(request.Username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, gin.H{
		"username":         user.Username,
		"role_code":        user.RoleCode,
		"approval_status":  user.ApprovalStatus,
		"rejection_reason": user.RejectionReason,
	})
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	current := middleware.GetCurrentUser(c)

	input := service.UpdateProfileInput{
		UserID:      current.ID,
		DisplayName: c.PostForm("display_name"),
		Phone:       c.PostForm("phone"),
		ContactInfo: c.PostForm("contact_info"),
	}

	file, err := c.FormFile("avatar")
	if err == nil {
		input.AvatarFile = file
	}

	result, err := h.authService.UpdateProfile(input)
	if err != nil {
		if errors.Is(err, service.ErrDisplayNameRequired) {
			responsex.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}

	responsex.Success(c, result)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	current := middleware.GetCurrentUser(c)

	var request changePasswordRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		responsex.Fail(c, http.StatusBadRequest, "修改密码参数格式错误")
		return
	}

	if err := h.authService.ChangePassword(service.ChangePasswordInput{
		UserID:          current.ID,
		OldPassword:     request.OldPassword,
		NewPassword:     request.NewPassword,
		ConfirmPassword: request.ConfirmPassword,
	}); err != nil {
		if errors.Is(err, service.ErrInvalidOldPassword) || errors.Is(err, service.ErrPasswordMismatch) {
			responsex.Fail(c, http.StatusBadRequest, err.Error())
			return
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "用户不存在")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, gin.H{"changed": true})
}
