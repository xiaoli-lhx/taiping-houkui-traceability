package service

import (
	"errors"
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

type AuthService struct {
	db        *gorm.DB
	jwtSecret string
	tokenTTL  time.Duration
}

type UserProfile struct {
	ID              uint       `json:"id"`
	Username        string     `json:"username"`
	DisplayName     string     `json:"display_name"`
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
		return attachSingleRole(tx, &user)
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
