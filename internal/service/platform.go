package service

import (
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

const (
	UploadRootDir      = "tmp/uploads"
	AvatarUploadSubdir = "avatars"

	NotificationLinkAdminRegistrations = "/admin/registrations"
	NotificationLinkAdminFeedback      = "/admin/feedback"
	NotificationLinkAdminLogs          = "/admin/logs"
	NotificationLinkProfile            = "/profile"
)

type NotificationListFilter struct {
	UserID   uint
	IsRead   *bool
	Page     int
	PageSize int
}

type NotificationListResult struct {
	Items      []model.Notification `json:"items"`
	Pagination map[string]int       `json:"pagination"`
}

type OperationLogFilter struct {
	ActorID    *uint
	Action     string
	TargetType string
	Page       int
	PageSize   int
}

type OperationLogView struct {
	ID               uint      `json:"id"`
	ActorID          uint      `json:"actor_id"`
	ActorRole        string    `json:"actor_role"`
	ActorUsername    string    `json:"actor_username"`
	ActorDisplayName string    `json:"actor_display_name"`
	Action           string    `json:"action"`
	TargetType       string    `json:"target_type"`
	TargetID         uint      `json:"target_id"`
	Summary          string    `json:"summary"`
	DetailJSON       string    `json:"detail_json"`
	CreatedAt        time.Time `json:"created_at"`
}

type TodoSummary struct {
	Items []TodoSummaryItem `json:"items"`
}

type TodoSummaryItem struct {
	Key   string `json:"key"`
	Label string `json:"label"`
	Count int64  `json:"count"`
}

type NotificationCreateInput struct {
	UserID    uint
	Category  string
	Title     string
	Content   string
	Link      string
	CreatedAt time.Time
}

type OperationLogCreateInput struct {
	ActorID    uint
	ActorRole  string
	Action     string
	TargetType string
	TargetID   uint
	Summary    string
	Detail     map[string]any
}

func createNotificationTx(tx *gorm.DB, input NotificationCreateInput) error {
	createdAt := input.CreatedAt
	if createdAt.IsZero() {
		createdAt = time.Now()
	}

	notification := model.Notification{
		UserID:    input.UserID,
		Category:  strings.TrimSpace(input.Category),
		Title:     strings.TrimSpace(input.Title),
		Content:   strings.TrimSpace(input.Content),
		Link:      strings.TrimSpace(input.Link),
		IsRead:    false,
		CreatedAt: createdAt,
	}
	return tx.Create(&notification).Error
}

func createNotificationsTx(tx *gorm.DB, inputs []NotificationCreateInput) error {
	for _, input := range inputs {
		if err := createNotificationTx(tx, input); err != nil {
			return err
		}
	}
	return nil
}

func logOperationTx(tx *gorm.DB, input OperationLogCreateInput) error {
	detailJSON := ""
	if len(input.Detail) > 0 {
		bytes, err := json.Marshal(input.Detail)
		if err != nil {
			return err
		}
		detailJSON = string(bytes)
	}

	log := model.OperationLog{
		ActorID:    input.ActorID,
		ActorRole:  strings.TrimSpace(input.ActorRole),
		Action:     strings.TrimSpace(input.Action),
		TargetType: strings.TrimSpace(input.TargetType),
		TargetID:   input.TargetID,
		Summary:    strings.TrimSpace(input.Summary),
		DetailJSON: detailJSON,
		CreatedAt:  time.Now(),
	}
	return tx.Create(&log).Error
}

func uploadRelativeURL(relativePath string) string {
	normalized := filepath.ToSlash(strings.TrimSpace(relativePath))
	if normalized == "" {
		return ""
	}
	return fmt.Sprintf("/uploads/%s", normalized)
}
