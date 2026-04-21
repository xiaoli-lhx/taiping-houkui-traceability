package app

import (
	"fmt"

	"github.com/gin-gonic/gin"

	"tea-traceability-system/internal/config"
	"tea-traceability-system/internal/database"
	"tea-traceability-system/internal/router"
	"tea-traceability-system/internal/service"
)

func Run() error {
	cfg := config.Load()

	if cfg.AppEnv == "prod" {
		gin.SetMode(gin.ReleaseMode)
	}

	db, err := database.NewMySQL(cfg)
	if err != nil {
		return fmt.Errorf("连接 MySQL 失败: %w", err)
	}

	if cfg.AutoMigrate {
		if err := database.AutoMigrate(db); err != nil {
			return fmt.Errorf("执行数据库迁移失败: %w", err)
		}
	}

	services := service.NewContainer(db, cfg)

	if cfg.SeedDemo {
		if err := service.SeedDemoData(db, services.Quality); err != nil {
			return fmt.Errorf("初始化演示数据失败: %w", err)
		}
	}

	engine := router.New(cfg, services)
	return engine.Run(cfg.ServerAddr)
}
