from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import verify_password, get_password_hash, create_access_token, get_current_admin
from models.admin_user import AdminUser

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


@router.get("/exists")
async def check_admin_exists(db: AsyncSession = Depends(get_db)):
    """
    Returns true if at least one admin exists in the database.
    Used by the frontend to decide whether to show Login or Register form.
    """
    result = await db.execute(select(func.count(AdminUser.id)))
    count = result.scalar()
    return {"exists": count > 0}


@router.post("/register")
async def register_admin(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Registers a new admin. ONLY works if no admins currently exist.
    """
    result = await db.execute(select(func.count(AdminUser.id)))
    count = result.scalar()
    
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is disabled because an admin already exists."
        )
    
    hashed_password = get_password_hash(data.password)
    new_admin = AdminUser(username=data.username, hashed_password=hashed_password)
    db.add(new_admin)
    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Could not create admin user.")
        
    return {"message": "Admin user created successfully."}


@router.post("/login", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, getting username and password from form data.
    """
    result = await db.execute(select(AdminUser).where(AdminUser.username == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def read_users_me(current_user: str = Depends(get_current_admin)):
    """
    Returns current user info if token is valid.
    """
    return {"username": current_user}
