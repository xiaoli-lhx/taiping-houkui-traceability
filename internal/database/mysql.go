package database

import (
	"errors"
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"tea-traceability-system/internal/config"
	"tea-traceability-system/internal/model"
)

func NewMySQL(cfg config.Config) (*gorm.DB, error) {
	if cfg.MySQLDSN == "" {
		return nil, errors.New("MYSQL_DSN 未配置")
	}

	db, err := gorm.Open(mysql.Open(cfg.MySQLDSN), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	if err := db.SetupJoinTable(&model.User{}, "Roles", &model.UserRole{}); err != nil {
		return nil, fmt.Errorf("初始化 user_roles 关联表失败: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetConnMaxLifetime(time.Duration(cfg.DBConnMaxLifetimeMinutes) * time.Minute)

	return db, nil
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.TeaBatch{},
		&model.TraceStageRecord{},
		&model.QualityEvaluation{},
		&model.QualityMetricDetail{},
		&model.AuditRecord{},
		&model.ConsumerFavorite{},
		&model.UserFeedback{},
		&model.ConsumerQueryHistory{},
	)
}
