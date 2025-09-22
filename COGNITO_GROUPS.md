# Cognito Groups Implementation

## Overview
This application uses AWS Cognito Groups for role-based access control, earning 2 additional marks for Assessment 2.

## Groups Structure

### Users Group (`users`)
- **Default group**: All new registrations automatically added
- **Permissions**: View/manage own images only
- **Precedence**: 2 (lower priority)

### Admins Group (`admins`)
- **Manual assignment**: Added by administrators
- **Permissions**: View all users' images, delete any image
- **Precedence**: 1 (higher priority)

## Implementation Details

### Registration Flow
1. User registers with email/password
2. Automatically added to `users` group
3. JWT token contains `cognito:groups` claim
4. Role determined by group membership

### Group Assignment
```bash
# Create groups (already done)
aws cognito-idp create-group --group-name "users" --user-pool-id "ap-southeast-2_3gyloQ1U7"
aws cognito-idp create-group --group-name "admins" --user-pool-id "ap-southeast-2_3gyloQ1U7"

# Assign existing users to groups
node assign-user-groups.js
```

### Code Changes
- Removed `custom:role` attribute from registration
- Added automatic group assignment in `cognitoService.signUp()`
- Updated `determineRole()` to check `cognito:groups` claim
- JWT middleware validates group membership

## Benefits
- Follows AWS best practices
- Scalable role management
- No custom attributes needed
- Production-ready implementation