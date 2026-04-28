package service

import (
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService(db *gorm.DB) *NotificationService {
	return &NotificationService{db: db}
}

func (s *NotificationService) ListNotifications(filter NotificationListFilter) (*NotificationListResult, error) {
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 10
	}

	query := s.db.Model(&model.Notification{}).Where("user_id = ?", filter.UserID)
	if filter.IsRead != nil {
		query = query.Where("is_read = ?", *filter.IsRead)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, err
	}

	var items []model.Notification
	if err := query.Order("created_at DESC, id DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&items).Error; err != nil {
		return nil, err
	}

	return &NotificationListResult{
		Items: items,
		Pagination: map[string]int{
			"page":      page,
			"page_size": pageSize,
			"total":     int(total),
		},
	}, nil
}

func (s *NotificationService) MarkRead(userID, notificationID uint) (*model.Notification, error) {
	now := time.Now()
	if err := s.db.Model(&model.Notification{}).
		Where("id = ? AND user_id = ?", notificationID, userID).
		Updates(map[string]any{"is_read": true, "read_at": &now}).Error; err != nil {
		return nil, err
	}

	var item model.Notification
	if err := s.db.Where("id = ? AND user_id = ?", notificationID, userID).First(&item).Error; err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *NotificationService) MarkAllRead(userID uint) error {
	now := time.Now()
	return s.db.Model(&model.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]any{"is_read": true, "read_at": &now}).Error
}

func (s *NotificationService) GetTodoSummary(operator OperatorContext) (*TodoSummary, error) {
	items := make([]TodoSummaryItem, 0, 4)

	unreadNotifications, err := s.countUnreadNotifications(operator.UserID)
	if err != nil {
		return nil, err
	}

	switch operator.PrimaryRole() {
	case model.RoleAdmin:
		pendingRegistrations, err := s.countRegistrationsByApprovalStatus(model.ApprovalPending)
		if err != nil {
			return nil, err
		}
		pendingFeedback, err := s.countPendingFeedback()
		if err != nil {
			return nil, err
		}
		items = append(items,
			TodoSummaryItem{Key: "pending_registrations", Label: "待审核注册", Count: pendingRegistrations},
			TodoSummaryItem{Key: "pending_feedback", Label: "待处理反馈", Count: pendingFeedback},
			TodoSummaryItem{Key: "unread_notifications", Label: "未读通知", Count: unreadNotifications},
		)
	case model.RoleFarmer, model.RoleEnterprise:
		rectificationCount, err := s.countRectificationsForRole(operator.PrimaryRole(), operator.Organization)
		if err != nil {
			return nil, err
		}
		items = append(items,
			TodoSummaryItem{Key: "pending_rectifications", Label: "待整改任务", Count: rectificationCount},
			TodoSummaryItem{Key: "unread_notifications", Label: "未读通知", Count: unreadNotifications},
		)
	case model.RoleRegulator:
		rectificationReviewCount, err := s.countRectificationReviews()
		if err != nil {
			return nil, err
		}
		riskAlerts, err := NewStatisticsService(s.db).GetRiskAlerts()
		if err != nil {
			return nil, err
		}
		items = append(items,
			TodoSummaryItem{Key: "pending_rectification_reviews", Label: "待复审整改", Count: rectificationReviewCount},
			TodoSummaryItem{Key: "risk_alerts", Label: "风险预警", Count: int64(len(riskAlerts))},
			TodoSummaryItem{Key: "unread_notifications", Label: "未读通知", Count: unreadNotifications},
		)
	case model.RoleConsumer:
		processingFeedbackCount, err := s.countConsumerProcessingFeedback(operator.UserID)
		if err != nil {
			return nil, err
		}
		items = append(items,
			TodoSummaryItem{Key: "processing_feedback", Label: "处理中反馈", Count: processingFeedbackCount},
			TodoSummaryItem{Key: "unread_notifications", Label: "未读通知", Count: unreadNotifications},
		)
	}

	return &TodoSummary{Items: items}, nil
}

func (s *NotificationService) countUnreadNotifications(userID uint) (int64, error) {
	var count int64
	err := s.db.Model(&model.Notification{}).Where("user_id = ? AND is_read = ?", userID, false).Count(&count).Error
	return count, err
}

func (s *NotificationService) countRegistrationsByApprovalStatus(status string) (int64, error) {
	var count int64
	err := s.db.Model(&model.User{}).Where("approval_status = ?", status).Count(&count).Error
	return count, err
}

func (s *NotificationService) countPendingFeedback() (int64, error) {
	var count int64
	err := s.db.Model(&model.UserFeedback{}).Where("status <> ?", model.FeedbackStatusResolved).Count(&count).Error
	return count, err
}

func (s *NotificationService) countRectificationsForRole(role, organization string) (int64, error) {
	query := s.db.Model(&model.RectificationTask{}).
		Where("responsible_role = ? AND status = ?", role, model.RectificationStatusPendingSubmission)

	if strings.TrimSpace(organization) != "" {
		if role == model.RoleFarmer {
			query = query.Joins("JOIN tea_batches ON tea_batches.id = rectification_tasks.batch_id").Where("tea_batches.farm_name = ?", strings.TrimSpace(organization))
		}
		if role == model.RoleEnterprise {
			query = query.Joins("JOIN tea_batches ON tea_batches.id = rectification_tasks.batch_id").Where("tea_batches.enterprise_name = ?", strings.TrimSpace(organization))
		}
	}

	var count int64
	err := query.Count(&count).Error
	return count, err
}

func (s *NotificationService) countRectificationReviews() (int64, error) {
	var count int64
	err := s.db.Model(&model.RectificationTask{}).Where("status = ?", model.RectificationStatusSubmitted).Count(&count).Error
	return count, err
}

func (s *NotificationService) countConsumerProcessingFeedback(userID uint) (int64, error) {
	var count int64
	err := s.db.Model(&model.UserFeedback{}).Where("user_id = ? AND status = ?", userID, model.FeedbackStatusProcessing).Count(&count).Error
	return count, err
}

func findUsersByRoleAndOrganization(tx *gorm.DB, roleCode, organization string) ([]model.User, error) {
	query := tx.Model(&model.User{}).Where("role_code = ? AND status = ?", roleCode, model.UserStatusActive)
	if strings.TrimSpace(organization) != "" {
		query = query.Where("organization = ?", strings.TrimSpace(organization))
	}

	var users []model.User
	if err := query.Find(&users).Error; err != nil {
		return nil, err
	}
	return users, nil
}
