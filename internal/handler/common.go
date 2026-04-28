package handler

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"tea-traceability-system/internal/middleware"
	"tea-traceability-system/internal/service"
)

func parseUintParam(c *gin.Context, key string) (uint, error) {
	value := strings.TrimSpace(c.Param(key))
	parsed, err := strconv.ParseUint(value, 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(parsed), nil
}

func parseFlexibleTime(value string) (*time.Time, error) {
	raw := strings.TrimSpace(value)
	if raw == "" {
		return nil, nil
	}

	layouts := []string{
		time.RFC3339,
		"2006-01-02 15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		parsed, err := time.Parse(layout, raw)
		if err == nil {
			return &parsed, nil
		}
	}

	return nil, fmt.Errorf("unsupported time format")
}

func parseIntDefault(value string, defaultValue int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return defaultValue
	}
	return parsed
}

func parseUintQuery(value string) (uint, error) {
	parsed, err := strconv.ParseUint(strings.TrimSpace(value), 10, 64)
	if err != nil {
		return 0, err
	}
	return uint(parsed), nil
}

func currentOperator(c *gin.Context) service.OperatorContext {
	current := middleware.GetCurrentUser(c)
	return service.OperatorContext{
		UserID:       current.ID,
		Username:     current.Username,
		DisplayName:  current.DisplayName,
		Organization: current.Organization,
		RoleCode:     current.RoleCode,
		Roles:        current.Roles,
	}
}
