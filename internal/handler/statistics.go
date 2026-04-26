package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type StatisticsHandler struct {
	statsService *service.StatisticsService
}

func NewStatisticsHandler(statsService *service.StatisticsService) *StatisticsHandler {
	return &StatisticsHandler{statsService: statsService}
}

func (h *StatisticsHandler) Overview(c *gin.Context) {
	stats, err := h.statsService.GetOverview()
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, stats)
}

func (h *StatisticsHandler) ProductionDistribution(c *gin.Context) {
	items, err := h.statsService.GetProductionDistribution()
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *StatisticsHandler) GradeDistribution(c *gin.Context) {
	items, err := h.statsService.GetGradeDistribution()
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *StatisticsHandler) MetricTrends(c *gin.Context) {
	items, err := h.statsService.GetMetricTrends(
		parseIntDefault(c.Query("days"), 30),
		c.Query("metric_name"),
	)
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *StatisticsHandler) RiskAlerts(c *gin.Context) {
	items, err := h.statsService.GetRiskAlerts()
	if err != nil {
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}
	responsex.Success(c, items)
}
