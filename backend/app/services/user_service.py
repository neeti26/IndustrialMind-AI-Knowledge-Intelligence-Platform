"""Simple user management service with password hashing."""
from passlib.context import CryptContext
from typing import Optional, Dict, List

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class User:
    def __init__(self, username: str, hashed_password: str, role: str = "viewer", email: str = ""):
        self.username = username
        self.hashed_password = hashed_password
        self.role = role  # admin, engineer, viewer
        self.email = email

    def verify_password(self, plain_password: str) -> bool:
        return pwd_context.verify(plain_password, self.hashed_password)


# In-memory user store. In production, use a database.
_users: Dict[str, User] = {}


def init_default_users():
    """Initialize with demo users."""
    global _users
    # username: password hash (demo: admin/admin, engineer/engineer123, viewer/viewer123)
    _users["admin"] = User(
        "admin",
        pwd_context.hash("admin"),
        role="admin",
        email="admin@industrialmind.io"
    )
    _users["engineer"] = User(
        "engineer",
        pwd_context.hash("engineer123"),
        role="engineer",
        email="engineer@industrialmind.io"
    )
    _users["viewer"] = User(
        "viewer",
        pwd_context.hash("viewer123"),
        role="viewer",
        email="viewer@industrialmind.io"
    )


def get_user(username: str) -> Optional[User]:
    """Retrieve user by username."""
    return _users.get(username)


def authenticate(username: str, password: str) -> Optional[User]:
    """Authenticate user and return User object if valid."""
    user = get_user(username)
    if user and user.verify_password(password):
        return user
    return None


def create_user(username: str, password: str, role: str = "viewer", email: str = "") -> bool:
    """Create a new user. Return False if user exists."""
    global _users
    if username in _users:
        return False
    _users[username] = User(username, pwd_context.hash(password), role, email)
    return True


def list_users() -> List[Dict]:
    """Return list of users (excluding passwords)."""
    return [
        {
            "username": u.username,
            "role": u.role,
            "email": u.email,
        }
        for u in _users.values()
    ]


def delete_user(username: str) -> bool:
    """Delete user. Return False if not found."""
    global _users
    if username in _users:
        del _users[username]
        return True
    return False


def update_user_role(username: str, new_role: str) -> bool:
    """Update user role. Return False if user not found."""
    user = get_user(username)
    if user:
        user.role = new_role
        return True
    return False
