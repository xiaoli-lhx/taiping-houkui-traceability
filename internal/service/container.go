package service

import (
	"gorm.io/gorm"

	"tea-traceability-system/internal/config"
)

type Container struct {
	Auth         *AuthService
	Admin        *AdminService
	Consumer     *ConsumerService
	Trace        *TraceService
	Quality      *QualityService
	Stats        *StatisticsService
	Attachment   *AttachmentService
	Notification *NotificationService
}

func NewContainer(db *gorm.DB, cfg config.Config) *Container {
	return &Container{
		Auth:         NewAuthService(db, cfg.JWTSecret, cfg.TokenTTL),
		Admin:        NewAdminService(db),
		Consumer:     NewConsumerService(db),
		Trace:        NewTraceService(db),
		Quality:      NewQualityService(db),
		Stats:        NewStatisticsService(db),
		Attachment:   NewAttachmentService(db),
		Notification: NewNotificationService(db),
	}
}
