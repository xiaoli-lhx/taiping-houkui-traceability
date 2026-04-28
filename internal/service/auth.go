package service

import (
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
	"tea-traceability-system/pkg/authx"
)

var ErrInvalidCredentials = errors.New("用户名、密码或角色不正确")
var ErrInvalidMetrics = errors.New("品质指标必须包含外形、色泽、香气、滋味四项，且分值范围为 0-100")
var ErrPendingApproval = errors.New("账号尚未审核通过")
var ErrRejectedApproval = errors.New("账号审核未通过，请联系管理员查看原因")
var ErrDisabledAccount = errors.New("账号已被停用")
var ErrUsernameExists = errors.New("用户名已存在")
var ErrRoleNotAllowed = errors.New("当前角色不支持自助注册")
var ErrPasswordMismatch = errors.New("两次密码输入不一致")
var ErrInvalidOldPassword = errors.New("原密码不正确")
var ErrDisplayNameRequired = errors.New("显示名称不能为空")

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	tokenTTL  time.Duration
}

type UserProfile struct {
	ID              uint       `json:"id"`
	Username        string     `json:"username"`
	DisplayName     string     `json:"display_name"`
	AvatarURL       string     `json:"avatar_url"`
	Phone           string     `json:"phone"`
	Organization    string     `json:"organization"`
	ContactInfo     string     `json:"contact_info"`
	RoleCode        string     `json:"role_code"`
	Status          string     `json:"status"`
	ApprovalStatus  string     `json:"approval_status"`
	ApprovedBy      *uint      `json:"approved_by,omitempty"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
	RejectionReason string     `json:"rejection_reason,omitempty"`
	Roles           []string   `json:"roles"`
}

type LoginResult struct {
	AccessToken string      `json:"access_token"`
	ExpiresAt   time.Time   `json:"expires_at"`
	User        UserProfile `json:"user"`
}

type RegisterInput struct {
	Username        string
	Password        string
	ConfirmPassword string
	DisplayName     string
	Phone           string
	Organization    string
	ContactInfo     string
	RoleCode        string
}

type UpdateProfileInput struct {
	UserID      uint
	DisplayName string
	Phone       string
	ContactInfo string
	AvatarFile  *multipart.FileHeader
}

type ChangePasswordInput struct {
	UserID          uint
	OldPassword     string
	NewPassword     string
	ConfirmPassword string
}

type ProfileUpdateResult struct {
	AccessToken string      `json:"access_token"`
	ExpiresAt   time.Time   `json:"expires_at"`
	User        UserProfile `json:"user"`
}

func NewAuthService(db *gorm.DB, jwtSecret string, tokenTTL time.Duration) *AuthService {
	return &AuthService{
		db:        db,
		jwtSecret: jwtSecret,
		tokenTTL:  tokenTTL,
	}
}

func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func (s *AuthService) Login(username, password, roleCode string) (*LoginResult, error) {
	var user model.User
	err := s.db.Preload("Roles").Where("username = ? AND role_code = ?", strings.TrimSpace(username), normalizeRoleCode(roleCode)).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if user.Status == model.UserStatusDisabled || user.ApprovalStatus == model.ApprovalDisabled {
		return nil, ErrDisabledAccount
	}
	if user.ApprovalStatus == model.ApprovalPending {
		return nil, ErrPendingApproval
	}
	if user.ApprovalStatus == model.ApprovalRejected {
		return nil, ErrRejectedApproval
	}
	if user.ApprovalStatus != model.ApprovalApproved {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	token, err := authx.GenerateToken(
		s.jwtSecret,
		s.tokenTTL,
		user.ID,
		user.Username,
		user.DisplayName,
		user.Organization,
		user.RoleCode,
		roleCodes(user),
	)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		AccessToken: token,
		ExpiresAt:   time.Now().Add(s.tokenTTL),
		User:        BuildUserProfile(&user),
	}, nil
}

func (s *AuthService) Register(input RegisterInput) (*model.User, error) {
	roleCode := normalizeRoleCode(input.RoleCode)
	if !isSelfRegisterRole(roleCode) {
		return nil, ErrRoleNotAllowed
	}

	if strings.TrimSpace(input.Password) == "" || input.Password != input.ConfirmPassword {
		return nil, ErrPasswordMismatch
	}

	var existing model.User
	if err := s.db.Where("username = ?", strings.TrimSpace(input.Username)).Limit(1).Find(&existing).Error; err != nil {
		return nil, err
	}
	if existing.ID != 0 {
		return nil, ErrUsernameExists
	}

	passwordHash, err := HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	user := model.User{
		Username:       strings.TrimSpace(input.Username),
		PasswordHash:   passwordHash,
		DisplayName:    strings.TrimSpace(input.DisplayName),
		Phone:          strings.TrimSpace(input.Phone),
		Organization:   strings.TrimSpace(input.Organization),
		ContactInfo:    strings.TrimSpace(defaultContactInfo(input.ContactInfo, input.Phone)),
		RoleCode:       roleCode,
		Status:         model.UserStatusActive,
		ApprovalStatus: model.ApprovalPending,
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
		if err := attachSingleRole(tx, &user); err != nil {
			return err
		}

		var admins []model.User
		if err := tx.Where("role_code = ? AND status = ?", model.RoleAdmin, model.UserStatusActive).Find(&admins).Error; err != nil {
			return err
		}

		notifications := make([]NotificationCreateInput, 0, len(admins))
		for _, admin := range admins {
			notifications = append(notifications, NotificationCreateInput{
				UserID:   admin.ID,
				Category: model.NotificationCategoryRegistrationReview,
				Title:    "新的注册申请待审核",
				Content:  fmt.Sprintf("用户 %s 提交了 %s 角色注册申请。", user.Username, user.RoleCode),
				Link:     NotificationLinkAdminRegistrations,
			})
		}
		return createNotificationsTx(tx, notifications)
	})
	if err != nil {
		return nil, err
	}

	return s.GetUserByID(user.ID)
}

func (s *AuthService) GetUserByID(id uint) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles").First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *AuthService) GetUserByUsername(username string) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles").Where("username = ?", strings.TrimSpace(username)).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func BuildUserProfile(user *model.User) UserProfile {
	return UserProfile{
		ID:              user.ID,
		Username:        user.Username,
		DisplayName:     user.DisplayName,
		AvatarURL:       user.AvatarURL,
		Phone:           user.Phone,
		Organization:    user.Organization,
		ContactInfo:     user.ContactInfo,
		RoleCode:        user.RoleCode,
		Status:          user.Status,
		ApprovalStatus:  user.ApprovalStatus,
		ApprovedBy:      user.ApprovedBy,
		ApprovedAt:      user.ApprovedAt,
		RejectionReason: user.RejectionReason,
		Roles:           roleCodes(*user),
	}
}

func (s *AuthService) UpdateProfile(input UpdateProfileInput) (*ProfileUpdateResult, error) {
	var user model.User
	if err := s.db.Preload("Roles").First(&user, input.UserID).Error; err != nil {
		return nil, err
	}

	displayName := strings.TrimSpace(input.DisplayName)
	if displayName == "" {
		return nil, ErrDisplayNameRequired
	}

	oldAvatarPath := strings.TrimPrefix(user.AvatarURL, "/uploads/")
	newAvatarURL := user.AvatarURL
	if input.AvatarFile != nil {
		relativePath, err := saveUploadedProfileFile(input.UserID, input.AvatarFile)
		if err != nil {
			return nil, err
		}
		newAvatarURL = uploadRelativeURL(relativePath)
	}

	previousDisplayName := user.DisplayName
	previousPhone := user.Phone
	previousContactInfo := user.ContactInfo

	user.DisplayName = displayName
	user.Phone = strings.TrimSpace(input.Phone)
	user.ContactInfo = strings.TrimSpace(defaultContactInfo(input.ContactInfo, input.Phone))
	user.AvatarURL = newAvatarURL

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&user).Error; err != nil {
			return err
		}

		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    user.ID,
			ActorRole:  user.RoleCode,
			Action:     "profile_update",
			TargetType: model.LogTargetUserProfile,
			TargetID:   user.ID,
			Summary:    "用户更新了个人资料",
			Detail: map[string]any{
				"display_name_before": previousDisplayName,
				"display_name_after":  user.DisplayName,
				"phone_before":        previousPhone,
				"phone_after":         user.Phone,
				"contact_before":      previousContactInfo,
				"contact_after":       user.ContactInfo,
				"avatar_updated":      input.AvatarFile != nil,
			},
		}); err != nil {
			return err
		}

		return createNotificationTx(tx, NotificationCreateInput{
			UserID:   user.ID,
			Category: model.NotificationCategorySystemNotice,
			Title:    "个人资料已更新",
			Content:  "你的头像或个人资料已保存成功。",
			Link:     NotificationLinkProfile,
		})
	}); err != nil {
		return nil, err
	}

	if input.AvatarFile != nil && oldAvatarPath != "" && oldAvatarPath != strings.TrimPrefix(newAvatarURL, "/uploads/") {
		_ = os.Remove(filepath.Join(UploadRootDir, oldAvatarPath))
	}

	token, err := authx.GenerateToken(
		s.jwtSecret,
		s.tokenTTL,
		user.ID,
		user.Username,
		user.DisplayName,
		user.Organization,
		user.RoleCode,
		roleCodes(user),
	)
	if err != nil {
		return nil, err
	}

	return &ProfileUpdateResult{
		AccessToken: token,
		ExpiresAt:   time.Now().Add(s.tokenTTL),
		User:        BuildUserProfile(&user),
	}, nil
}

func (s *AuthService) ChangePassword(input ChangePasswordInput) error {
	if strings.TrimSpace(input.NewPassword) == "" || input.NewPassword != input.ConfirmPassword {
		return ErrPasswordMismatch
	}

	var user model.User
	if err := s.db.First(&user, input.UserID).Error; err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.OldPassword)); err != nil {
		return ErrInvalidOldPassword
	}

	newPasswordHash, err := HashPassword(input.NewPassword)
	if err != nil {
		return err
	}

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.User{}).Where("id = ?", input.UserID).Update("password_hash", newPasswordHash).Error; err != nil {
			return err
		}
		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    user.ID,
			ActorRole:  user.RoleCode,
			Action:     "change_password",
			TargetType: model.LogTargetUserProfile,
			TargetID:   user.ID,
			Summary:    "用户修改了登录密码",
		}); err != nil {
			return err
		}
		return createNotificationTx(tx, NotificationCreateInput{
			UserID:   user.ID,
			Category: model.NotificationCategorySystemNotice,
			Title:    "密码修改成功",
			Content:  "你的登录密码已更新成功。",
			Link:     NotificationLinkProfile,
		})
	})
}

func roleCodes(user model.User) []string {
	if len(user.Roles) > 0 {
		result := make([]string, 0, len(user.Roles))
		for _, role := range user.Roles {
			result = append(result, role.Code)
		}
		return result
	}
	if user.RoleCode != "" {
		return []string{user.RoleCode}
	}
	return nil
}

func normalizeRoleCode(roleCode string) string {
	return strings.ToLower(strings.TrimSpace(roleCode))
}

func isSelfRegisterRole(roleCode string) bool {
	switch roleCode {
	case model.RoleFarmer, model.RoleEnterprise, model.RoleConsumer:
		return true
	default:
		return false
	}
}

func defaultContactInfo(contactInfo, phone string) string {
	if strings.TrimSpace(contactInfo) != "" {
		return contactInfo
	}
	return phone
}

func attachSingleRole(tx *gorm.DB, user *model.User) error {
	var role model.Role
	if err := tx.Where("code = ?", user.RoleCode).First(&role).Error; err != nil {
		return err
	}

	if err := tx.Where("user_id = ?", user.ID).Delete(&model.UserRole{}).Error; err != nil {
		return err
	}

	return tx.Create(&model.UserRole{UserID: user.ID, RoleID: role.ID}).Error
}

func saveUploadedProfileFile(userID uint, file *multipart.FileHeader) (string, error) {
	if err := os.MkdirAll(filepath.Join(UploadRootDir, AvatarUploadSubdir), 0o755); err != nil {
		return "", err
	}

	src, err := file.Open()
	if err != nil {
		return "", err
	}
	defer src.Close()

	extension := filepath.Ext(file.Filename)
	storedName := fmt.Sprintf("user_%d_%d%s", userID, time.Now().UnixNano(), extension)
	relativePath := filepath.Join(AvatarUploadSubdir, storedName)
	destinationPath := filepath.Join(UploadRootDir, relativePath)

	dst, err := os.Create(destinationPath)
	if err != nil {
		return "", err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(src); err != nil {
		return "", err
	}

	return filepath.ToSlash(relativePath), nil
}
