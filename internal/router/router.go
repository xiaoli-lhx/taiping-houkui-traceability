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
	consumerHandler := handler.NewConsumerHandler(services.Consumer)
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

	api := engine.Group("/api/v1")

	api.POST("/auth/login", authHandler.Login)
	api.POST("/auth/register", authHandler.Register)
	api.GET("/auth/registration-status", authHandler.RegistrationStatus)
	api.GET("/public/traces/:code", publicHandler.GetTrace)

	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware(cfg.JWTSecret))
	protected.GET("/auth/me", authHandler.Me)

	adminGroup := protected.Group("/admin")
	adminGroup.Use(middleware.RequireRoles(model.RoleAdmin))
	adminGroup.GET("/users", adminHandler.ListUsers)
	adminGroup.GET("/users/:id", adminHandler.GetUser)
	adminGroup.GET("/registrations", adminHandler.ListRegistrations)
	adminGroup.POST("/registrations/:id/approve", adminHandler.ApproveRegistration)
	adminGroup.POST("/registrations/:id/reject", adminHandler.RejectRegistration)

	consumerGroup := protected.Group("/consumer")
	consumerGroup.Use(middleware.RequireRoles(model.RoleConsumer))
	consumerGroup.POST("/favorites", consumerHandler.CreateFavorite)
	consumerGroup.GET("/favorites", consumerHandler.ListFavorites)
	consumerGroup.POST("/feedback", consumerHandler.CreateFeedback)
	consumerGroup.GET("/history", consumerHandler.ListHistory)
	consumerGroup.POST("/history", consumerHandler.CreateHistory)

	traceGroup := protected.Group("/trace")
	traceGroup.Use(middleware.RequireRoles(model.RoleFarmer, model.RoleEnterprise, model.RoleRegulator))
	traceGroup.GET("/batches", traceHandler.ListBatches)
	traceGroup.POST("/batches", traceHandler.CreateBatch)
	traceGroup.GET("/batches/:id", traceHandler.GetBatch)
	traceGroup.PUT("/batches/:id", traceHandler.UpdateBatch)
	traceGroup.POST("/batches/:id/stages", traceHandler.CreateStage)
	traceGroup.GET("/batches/:id/audits", traceHandler.ListAudits)
	traceGroup.PUT("/stages/:id", traceHandler.UpdateStage)
	traceGroup.DELETE("/stages/:id", traceHandler.DeleteStage)
	traceGroup.POST("/batches/:id/audits", middleware.RequireRoles(model.RoleRegulator), traceHandler.CreateAudit)

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

	engine.NoRoute(func(c *gin.Context) {
		responsex.Fail(c, 404, "接口不存在")
	})

	return engine
}
