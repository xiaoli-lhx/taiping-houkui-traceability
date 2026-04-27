package service

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

const AdminResetPasswordValue = "123456"

type AdminService struct {
	db *gorm.DB
}

type UserListFilter struct {
	Keyword        string
	RoleCode       string
	Status         string
	ApprovalStatus string
}

type FeedbackListFilter struct {
	Status string
}

type FeedbackProcessInput struct {
	Status      string
	ProcessNote string
	OperatorID  uint
}

type FeedbackTicketView struct {
	ID          uint       `json:"id"`
	UserID      uint       `json:"user_id"`
	Username    string     `json:"username"`
	DisplayName string     `json:"display_name"`
	BatchID     *uint      `json:"batch_id,omitempty"`
	BatchCode   string     `json:"batch_code,omitempty"`
	TraceCode   string     `json:"trace_code"`
	Content     string     `json:"content"`
	ContactInfo string     `json:"contact_info"`
	Status      string     `json:"status"`
	ProcessNote string     `json:"process_note"`
	ProcessedBy *uint      `json:"processed_by,omitempty"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
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
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
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
	return s.ListUsers(buildRegistrationFilter(status))
}

func (s *AdminService) GetUser(userID uint) (*model.User, error) {
	return s.getUser(userID)
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

func (s *AdminService) EnableUser(userID uint) (*model.User, error) {
	if err := s.db.Model(&model.User{}).Where("id = ?", userID).Update("status", model.UserStatusActive).Error; err != nil {
		return nil, err
	}
	return s.getUser(userID)
}

func (s *AdminService) DisableUser(userID, operatorID uint) (*model.User, error) {
	if userID == operatorID {
		return nil, errors.New("不能停用当前登录管理员账号")
	}

	if err := s.db.Model(&model.User{}).Where("id = ?", userID).Update("status", model.UserStatusDisabled).Error; err != nil {
		return nil, err
	}
	return s.getUser(userID)
}

func (s *AdminService) ResetPassword(userID uint) (*model.User, error) {
	passwordHash, err := HashPassword(AdminResetPasswordValue)
	if err != nil {
		return nil, err
	}

	if err := s.db.Model(&model.User{}).Where("id = ?", userID).Update("password_hash", passwordHash).Error; err != nil {
		return nil, err
	}
	return s.getUser(userID)
}

func (s *AdminService) ListFeedback(filter FeedbackListFilter) ([]FeedbackTicketView, error) {
	query := s.db.Model(&model.UserFeedback{})
	if status := strings.TrimSpace(filter.Status); status != "" {
		query = query.Where("status = ?", status)
	}

	var feedbacks []model.UserFeedback
	if err := query.Order("created_at DESC, id DESC").Find(&feedbacks).Error; err != nil {
		return nil, err
	}

	return s.buildFeedbackViews(feedbacks)
}

func (s *AdminService) ProcessFeedback(id uint, input FeedbackProcessInput) (*FeedbackTicketView, error) {
	status := normalizeFeedbackStatus(input.Status)
	if status == "" {
		return nil, errors.New("反馈处理状态不合法")
	}

	now := time.Now()
	updates := map[string]any{
		"status":       status,
		"process_note": strings.TrimSpace(input.ProcessNote),
		"processed_by": &input.OperatorID,
		"processed_at": &now,
	}
	if err := s.db.Model(&model.UserFeedback{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return nil, err
	}

	var feedback model.UserFeedback
	if err := s.db.First(&feedback, id).Error; err != nil {
		return nil, err
	}

	items, err := s.buildFeedbackViews([]model.UserFeedback{feedback})
	if err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, gorm.ErrRecordNotFound
	}
	return &items[0], nil
}

func (s *AdminService) getUser(userID uint) (*model.User, error) {
	var user model.User
	if err := s.db.Preload("Roles").First(&user, userID).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (s *AdminService) buildFeedbackViews(feedbacks []model.UserFeedback) ([]FeedbackTicketView, error) {
	if len(feedbacks) == 0 {
		return []FeedbackTicketView{}, nil
	}

	userIDs := make([]uint, 0, len(feedbacks))
	batchIDs := make([]uint, 0, len(feedbacks))
	seenUsers := map[uint]struct{}{}
	seenBatches := map[uint]struct{}{}
	for _, feedback := range feedbacks {
		if _, exists := seenUsers[feedback.UserID]; !exists {
			seenUsers[feedback.UserID] = struct{}{}
			userIDs = append(userIDs, feedback.UserID)
		}
		if feedback.BatchID != nil {
			if _, exists := seenBatches[*feedback.BatchID]; !exists {
				seenBatches[*feedback.BatchID] = struct{}{}
				batchIDs = append(batchIDs, *feedback.BatchID)
			}
		}
	}

	users := make(map[uint]model.User, len(userIDs))
	if len(userIDs) > 0 {
		var items []model.User
		if err := s.db.Where("id IN ?", userIDs).Find(&items).Error; err != nil {
			return nil, err
		}
		for _, user := range items {
			users[user.ID] = user
		}
	}

	batches := make(map[uint]model.TeaBatch, len(batchIDs))
	if len(batchIDs) > 0 {
		var items []model.TeaBatch
		if err := s.db.Where("id IN ?", batchIDs).Find(&items).Error; err != nil {
			return nil, err
		}
		for _, batch := range items {
			batches[batch.ID] = batch
		}
	}

	result := make([]FeedbackTicketView, 0, len(feedbacks))
	for _, feedback := range feedbacks {
		user := users[feedback.UserID]
		view := FeedbackTicketView{
			ID:          feedback.ID,
			UserID:      feedback.UserID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			BatchID:     feedback.BatchID,
			TraceCode:   feedback.TraceCode,
			Content:     feedback.Content,
			ContactInfo: feedback.ContactInfo,
			Status:      feedback.Status,
			ProcessNote: feedback.ProcessNote,
			ProcessedBy: feedback.ProcessedBy,
			ProcessedAt: feedback.ProcessedAt,
			CreatedAt:   feedback.CreatedAt,
			UpdatedAt:   feedback.UpdatedAt,
		}
		if feedback.BatchID != nil {
			if batch, exists := batches[*feedback.BatchID]; exists {
				view.BatchCode = batch.BatchCode
				if view.TraceCode == "" {
					view.TraceCode = batch.TraceCode
				}
			}
		}
		result = append(result, view)
	}

	return result, nil
}

func normalizeFeedbackStatus(status string) string {
	switch strings.TrimSpace(status) {
	case model.FeedbackStatusPending, model.FeedbackStatusProcessing, model.FeedbackStatusResolved:
		return strings.TrimSpace(status)
	default:
		return ""
	}
}

func buildRegistrationFilter(status string) UserListFilter {
	filter := UserListFilter{}
	switch strings.TrimSpace(status) {
	case "":
		filter.ApprovalStatus = model.ApprovalPending
	case model.UserStatusDisabled:
		filter.Status = model.UserStatusDisabled
	default:
		filter.ApprovalStatus = strings.TrimSpace(status)
	}
	return filter
}
