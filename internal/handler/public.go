package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type PublicHandler struct {
	traceService *service.TraceService
}

func NewPublicHandler(traceService *service.TraceService) *PublicHandler {
	return &PublicHandler{traceService: traceService}
}

func (h *PublicHandler) GetTrace(c *gin.Context) {
	code := strings.TrimSpace(c.Param("code"))
	if code == "" {
		responsex.Fail(c, http.StatusBadRequest, "查询码不能为空")
		return
	}

	trace, err := h.traceService.GetPublicTrace(code)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "未查询到公开溯源信息")
			return
		}
		responsex.Fail(c, http.StatusInternalServerError, err.Error())
		return
	}

	responsex.Success(c, trace)
}
