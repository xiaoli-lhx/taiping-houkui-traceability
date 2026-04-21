package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"tea-traceability-system/pkg/authx"
	"tea-traceability-system/pkg/responsex"
)

const (
	contextUserIDKey       = "current_user_id"
	contextUsernameKey     = "current_username"
	contextDisplayNameKey  = "current_display_name"
	contextOrganizationKey = "current_organization"
	contextRoleCodeKey     = "current_role_code"
	contextRolesKey        = "current_roles"
)

type CurrentUser struct {
	ID           uint
	Username     string
	DisplayName  string
	Organization string
	RoleCode     string
	Roles        []string
}

func AuthMiddleware(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := strings.TrimSpace(c.GetHeader("Authorization"))
		if authHeader == "" {
			responsex.Fail(c, http.StatusUnauthorized, "缺少 Authorization 请求头")
			c.Abort()
			return
		}

		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer"))
		if tokenString == authHeader {
			responsex.Fail(c, http.StatusUnauthorized, "Authorization 格式应为 Bearer <token>")
			c.Abort()
			return
		}

		claims, err := authx.ParseToken(secret, tokenString)
		if err != nil {
			responsex.Fail(c, http.StatusUnauthorized, "登录状态无效或已过期")
			c.Abort()
			return
		}

		c.Set(contextUserIDKey, claims.UserID)
		c.Set(contextUsernameKey, claims.Username)
		c.Set(contextDisplayNameKey, claims.DisplayName)
		c.Set(contextOrganizationKey, claims.Organization)
		c.Set(contextRoleCodeKey, claims.RoleCode)
		c.Set(contextRolesKey, claims.Roles)
		c.Next()
	}
}

func RequireRoles(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		current := GetCurrentUser(c)
		if len(current.Roles) == 0 {
			responsex.Fail(c, http.StatusForbidden, "当前用户未分配角色")
			c.Abort()
			return
		}

		for _, role := range current.Roles {
			for _, allowed := range roles {
				if role == allowed {
					c.Next()
					return
				}
			}
		}

		responsex.Fail(c, http.StatusForbidden, "当前角色无权访问该接口")
		c.Abort()
	}
}

func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func GetCurrentUser(c *gin.Context) CurrentUser {
	user := CurrentUser{}

	if value, exists := c.Get(contextUserIDKey); exists {
		if id, ok := value.(uint); ok {
			user.ID = id
		}
	}

	if value, exists := c.Get(contextUsernameKey); exists {
		if username, ok := value.(string); ok {
			user.Username = username
		}
	}

	if value, exists := c.Get(contextDisplayNameKey); exists {
		if displayName, ok := value.(string); ok {
			user.DisplayName = displayName
		}
	}

	if value, exists := c.Get(contextOrganizationKey); exists {
		if organization, ok := value.(string); ok {
			user.Organization = organization
		}
	}

	if value, exists := c.Get(contextRoleCodeKey); exists {
		if roleCode, ok := value.(string); ok {
			user.RoleCode = roleCode
		}
	}

	if value, exists := c.Get(contextRolesKey); exists {
		if roles, ok := value.([]string); ok {
			user.Roles = roles
		}
	}

	return user
}
