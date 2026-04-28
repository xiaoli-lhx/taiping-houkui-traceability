package service

import (
	"errors"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type ConsumerService struct {
	db *gorm.DB
}

type CreateFavoriteInput struct {
	UserID  uint
	BatchID uint
}

type CreateFeedbackInput struct {
	UserID      uint
	BatchID     *uint
	TraceCode   string
	Content     string
	ContactInfo string
}

type CreateHistoryInput struct {
	UserID uint
	Code   string
}

type FavoriteView struct {
	ID        uint           `json:"id"`
	UserID    uint           `json:"user_id"`
	BatchID   uint           `json:"batch_id"`
	CreatedAt time.Time      `json:"created_at"`
	Batch     model.TeaBatch `json:"batch"`
}

func NewConsumerService(db *gorm.DB) *ConsumerService {
	return &ConsumerService{db: db}
}

func (s *ConsumerService) CreateFavorite(input CreateFavoriteInput) (*FavoriteView, error) {
	var batch model.TeaBatch
	if err := s.db.First(&batch, input.BatchID).Error; err != nil {
		return nil, err
	}
	if !batch.PublicVisible {
		return nil, errors.New("当前批次未开放消费者收藏")
	}

	var favorite model.ConsumerFavorite
	if err := s.db.Where("user_id = ? AND batch_id = ?", input.UserID, input.BatchID).Limit(1).Find(&favorite).Error; err != nil {
		return nil, err
	}
	if favorite.ID == 0 {
		favorite = model.ConsumerFavorite{
			UserID:  input.UserID,
			BatchID: input.BatchID,
		}
		if err := s.db.Create(&favorite).Error; err != nil {
			return nil, err
		}
	}

	return &FavoriteView{
		ID:        favorite.ID,
		UserID:    favorite.UserID,
		BatchID:   favorite.BatchID,
		CreatedAt: favorite.CreatedAt,
		Batch:     batch,
	}, nil
}

func (s *ConsumerService) ListFavorites(userID uint) ([]FavoriteView, error) {
	var favorites []model.ConsumerFavorite
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&favorites).Error; err != nil {
		return nil, err
	}

	result := make([]FavoriteView, 0, len(favorites))
	for _, favorite := range favorites {
		var batch model.TeaBatch
		if err := s.db.First(&batch, favorite.BatchID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				continue
			}
			return nil, err
		}
		result = append(result, FavoriteView{
			ID:        favorite.ID,
			UserID:    favorite.UserID,
			BatchID:   favorite.BatchID,
			CreatedAt: favorite.CreatedAt,
			Batch:     batch,
		})
	}
	return result, nil
}

func (s *ConsumerService) CreateFeedback(input CreateFeedbackInput) (*model.UserFeedback, error) {
	feedback := model.UserFeedback{
		UserID:      input.UserID,
		BatchID:     input.BatchID,
		TraceCode:   strings.TrimSpace(input.TraceCode),
		Content:     strings.TrimSpace(input.Content),
		ContactInfo: strings.TrimSpace(input.ContactInfo),
		Status:      model.FeedbackStatusPending,
	}
	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&feedback).Error; err != nil {
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
				Category: model.NotificationCategoryFeedbackTicket,
				Title:    "收到新的反馈工单",
				Content:  "有新的消费者反馈待处理，请及时查看。",
				Link:     NotificationLinkAdminFeedback,
			})
		}
		return createNotificationsTx(tx, notifications)
	}); err != nil {
		return nil, err
	}
	return &feedback, nil
}

func (s *ConsumerService) ListFeedback(userID uint) ([]model.UserFeedback, error) {
	var items []model.UserFeedback
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC, id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *ConsumerService) ListHistory(userID uint) ([]model.ConsumerQueryHistory, error) {
	var items []model.ConsumerQueryHistory
	if err := s.db.Where("user_id = ?", userID).Order("queried_at DESC, id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *ConsumerService) CreateHistory(input CreateHistoryInput) (*model.ConsumerQueryHistory, error) {
	view, err := NewTraceService(s.db).GetPublicTrace(strings.TrimSpace(input.Code))
	if err != nil {
		return nil, err
	}

	history := model.ConsumerQueryHistory{
		UserID:      input.UserID,
		CodeQueried: strings.TrimSpace(input.Code),
		BatchID:     &view.Batch.ID,
		BatchCode:   view.Batch.BatchCode,
		TraceCode:   view.Batch.TraceCode,
		QueriedAt:   time.Now(),
	}
	if err := s.db.Create(&history).Error; err != nil {
		return nil, err
	}
	return &history, nil
}
