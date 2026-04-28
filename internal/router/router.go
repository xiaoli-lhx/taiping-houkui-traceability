package router

import (
	"github.com/gin-gonic/gin"

	"tea-traceability-system/internal/config"
	"tea-traceability-system/internal/handler"
	"tea-traceability-system/internal/middleware"
	"tea-traceability-system/internal/model"
	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

func New(cfg config.Config, services *service.Container) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery(), middleware.CORS())
	_ = engine.SetTrustedProxies(nil)

	authHandler := handler.NewAuthHandler(services.Auth)
	adminHandler := handler.NewAdminHandler(services.Admin)
	attachmentHandler := handler.NewAttachmentHandler(services.Attachment)
	consumerHandler := handler.NewConsumerHandler(services.Consumer)
	notificationHandler := handler.NewNotificationHandler(services.Notification)
	traceHandler := handler.NewTraceHandler(services.Trace)
	qualityHandler := handler.NewQualityHandler(services.Quality)
	statsHandler := handler.NewStatisticsHandler(services.Stats)
	publicHandler := handler.NewPublicHandler(services.Trace)

	engine.GET("/healthz", func(c *gin.Context) {
		responsex.Success(c, gin.H{
			"app":    cfg.AppName,
			"status": "ok",
		})
	})
	engine.Static("/uploads", service.UploadRootDir)

	api := engine.Group("/api/v1")

	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/register", authHandler.Register)
	api.GET("/auth/registration-status", authHandler.RegistrationStatus)
	api.GET("/public/traces/:code", publicHandler.GetTrace)

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	protected.GET("/auth/me", authHandler.Me)
	protected.PUT("/auth/profile", authHandler.UpdateProfile)
	protected.POST("/auth/change-password", authHandler.ChangePassword)
	protected.GET("/notifications", notificationHandler.List)
	protected.POST("/notifications/:id/read", notificationHandler.MarkRead)
	protected.POST("/notifications/read-all", notificationHandler.MarkAllRead)
	protected.GET("/dashboard/todos", notificationHandler.Todos)

	adminGroup := protected.Group("/admin")
	adminGroup.Use(middleware.RequireRoles(model.RoleAdmin))
	adminGroup.GET("/users", adminHandler.ListUsers)
	adminGroup.GET("/users/:id", adminHandler.GetUser)
	adminGroup.POST("/users/:id/enable", adminHandler.EnableUser)
	adminGroup.POST("/users/:id/disable", adminHandler.DisableUser)
	adminGroup.POST("/users/:id/reset-password", adminHandler.ResetPassword)
	adminGroup.GET("/registrations", adminHandler.ListRegistrations)
	adminGroup.POST("/registrations/:id/approve", adminHandler.ApproveRegistration)
	adminGroup.POST("/registrations/:id/reject", adminHandler.RejectRegistration)
	adminGroup.GET("/feedback", adminHandler.ListFeedback)
	adminGroup.POST("/feedback/:id/process", adminHandler.ProcessFeedback)
	adminGroup.GET("/logs", adminHandler.ListLogs)

	consumerGroup := protected.Group("/consumer")
	consumerGroup.Use(middleware.RequireRoles(model.RoleConsumer))
	consumerGroup.POST("/favorites", consumerHandler.CreateFavorite)
	consumerGroup.GET("/favorites", consumerHandler.ListFavorites)
	consumerGroup.POST("/feedback", consumerHandler.CreateFeedback)
	consumerGroup.GET("/feedback", consumerHandler.ListFeedback)
	consumerGroup.GET("/history", consumerHandler.ListHistory)
	consumerGroup.POST("/history", consumerHandler.CreateHistory)

	traceGroup := protected.Group("/trace")
	traceReadGroup := traceGroup.Group("")
	traceReadGroup.Use(middleware.RequireRoles(model.RoleAdmin, model.RoleFarmer, model.RoleEnterprise, model.RoleRegulator))
	traceReadGroup.GET("/batches", traceHandler.ListBatches)
	traceReadGroup.GET("/batches/:id", traceHandler.GetBatch)
	traceReadGroup.GET("/batches/:id/audits", traceHandler.ListAudits)
	traceReadGroup.GET("/rectifications", middleware.RequireRoles(model.RoleFarmer, model.RoleEnterprise, model.RoleRegulator), traceHandler.ListRectifications)

	traceBatchWriteGroup := traceGroup.Group("")
	traceBatchWriteGroup.Use(middleware.RequireRoles(model.RoleEnterprise))
	traceBatchWriteGroup.POST("/batches", traceHandler.CreateBatch)
	traceBatchWriteGroup.PUT("/batches/:id", traceHandler.UpdateBatch)

	traceStageWriteGroup := traceGroup.Group("")
	traceStageWriteGroup.Use(middleware.RequireRoles(model.RoleFarmer, model.RoleEnterprise))
	traceStageWriteGroup.POST("/batches/:id/stages", traceHandler.CreateStage)
	traceStageWriteGroup.PUT("/stages/:id", traceHandler.UpdateStage)
	traceStageWriteGroup.DELETE("/stages/:id", traceHandler.DeleteStage)
	traceStageWriteGroup.POST("/rectifications/:id/submit", traceHandler.SubmitRectification)

	traceReviewGroup := traceGroup.Group("")
	traceReviewGroup.Use(middleware.RequireRoles(model.RoleRegulator))
	traceReviewGroup.POST("/batches/:id/audits", traceHandler.CreateAudit)
	traceReviewGroup.POST("/rectifications/:id/review", traceHandler.ReviewRectification)

	attachmentGroup := protected.Group("/attachments")
	attachmentGroup.GET("", attachmentHandler.List)
	attachmentGroup.POST("", attachmentHandler.Create)
	attachmentGroup.DELETE("/:id", attachmentHandler.Delete)

	qualityGroup := protected.Group("/quality")
	qualityGroup.POST("/evaluations", middleware.RequireRoles(model.RoleEnterprise, model.RoleRegulator), qualityHandler.CreateEvaluation)
	qualityGroup.GET("/evaluations/:id", middleware.RequireRoles(model.RoleFarmer, model.RoleEnterprise, model.RoleRegulator), qualityHandler.GetEvaluation)
	qualityGroup.GET("/batches/:batchID/latest", middleware.RequireRoles(model.RoleFarmer, model.RoleEnterprise, model.RoleRegulator), qualityHandler.GetLatestByBatch)

	statsGroup := protected.Group("/stats")
	statsGroup.Use(middleware.RequireRoles(model.RoleEnterprise, model.RoleRegulator, model.RoleAdmin))
	statsGroup.GET("/overview", statsHandler.Overview)
	statsGroup.GET("/production-distribution", statsHandler.ProductionDistribution)
	statsGroup.GET("/grade-distribution", statsHandler.GradeDistribution)
	statsGroup.GET("/metric-trends", statsHandler.MetricTrends)
	statsGroup.GET("/risk-alerts", middleware.RequireRoles(model.RoleAdmin, model.RoleRegulator), statsHandler.RiskAlerts)

	engine.NoRoute(func(c *gin.Context) {
		responsex.Fail(c, 404, "接口不存在")
	})

	return engine
}
