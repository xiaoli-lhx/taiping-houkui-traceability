package service

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type AdminService struct {
	db *gorm.DB
}

type UserListFilter struct {
	Keyword        string
	RoleCode       string
	ApprovalStatus string
}

func NewAdminService(db *gorm.DB) *AdminService {
	return &AdminService{db: db}
}

func (s *AdminService) ListUsers(filter UserListFilter) ([]model.User, error) {
	query := s.db.Preload("Roles").Model(&model.User{})
	if keyword := strings.TrimSpace(filter.Keyword); keyword != "" {
		query = query.Where("username LIKE ? OR display_name LIKE ? OR organization LIKE ?", "%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%")
	}
	if roleCode := strings.TrimSpace(filter.RoleCode); roleCode != "" {
		query = query.Where("role_code = ?", roleCode)
	}
	if approvalStatus := strings.TrimSpace(filter.ApprovalStatus); approvalStatus != "" {
		query = query.Where("approval_status = ?", approvalStatus)
	}

	var users []model.User
	if err := query.Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}

func (s *AdminService) ListRegistrations(status string) ([]model.User, error) {
	filter := UserListFilter{ApprovalStatus: strings.TrimSpace(status)}
	if filter.ApprovalStatus == "" {
		filter.ApprovalStatus = model.ApprovalPending
	}
	return s.ListUsers(filter)
}

func (s *AdminService) ApproveRegistration(userID, adminID uint) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}
	if user.RoleCode == model.RoleAdmin {
		return nil, errors.New("不能通过该接口审核管理员账号")
	}

	now := time.Now()
	updates := map[string]any{
		"approval_status":  model.ApprovalApproved,
		"status":           model.UserStatusActive,
		"approved_by":      adminID,
		"approved_at":      &now,
		"rejection_reason": "",
	}
	if err := s.db.Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.getUser(userID)
}

func (s *AdminService) RejectRegistration(userID, adminID uint, reason string) (*model.User, error) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	updates := map[string]any{
		"approval_status":  model.ApprovalRejected,
		"approved_by":      adminID,
		"approved_at":      &now,
		"rejection_reason": strings.TrimSpace(reason),
	}
	if err := s.db.Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		return nil, err
	}
	return s.getUser(userID)
}

func (s *AdminService) getUser(userID uint) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles").First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
