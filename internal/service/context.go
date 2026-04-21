package service

type OperatorContext struct {
	UserID       uint
	Username     string
	DisplayName  string
	Organization string
	RoleCode     string
	Roles        []string
}

func (c OperatorContext) Name() string {
	if c.DisplayName != "" {
		return c.DisplayName
	}
	return c.Username
}

func (c OperatorContext) PrimaryRole() string {
	if c.RoleCode != "" {
		return c.RoleCode
	}
	if len(c.Roles) == 0 {
		return ""
	}
	return c.Roles[0]
}

func (c OperatorContext) OrganizationName() string {
	return c.Organization
}
