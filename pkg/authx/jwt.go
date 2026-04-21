package authx

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID       uint     `json:"user_id"`
	Username     string   `json:"username"`
	DisplayName  string   `json:"display_name"`
	Organization string   `json:"organization"`
	RoleCode     string   `json:"role_code"`
	Roles        []string `json:"roles"`
	jwt.RegisteredClaims
}

func GenerateToken(secret string, ttl time.Duration, userID uint, username, displayName, organization, roleCode string, roles []string) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID:       userID,
		Username:     username,
		DisplayName:  displayName,
		Organization: organization,
		RoleCode:     roleCode,
		Roles:        roles,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}

	return claims, nil
}
