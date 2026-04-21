package responsex

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Envelope struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

func Success(c *gin.Context, data any) {
	JSON(c, http.StatusOK, 0, "ok", data)
}

func Created(c *gin.Context, data any) {
	JSON(c, http.StatusCreated, 0, "created", data)
}

func Fail(c *gin.Context, httpStatus int, message string) {
	JSON(c, httpStatus, httpStatus, message, nil)
}

func JSON(c *gin.Context, httpStatus, code int, message string, data any) {
	c.JSON(httpStatus, Envelope{
		Code:    code,
		Message: message,
		Data:    data,
	})
}
