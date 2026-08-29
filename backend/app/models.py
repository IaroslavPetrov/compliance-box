from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    tenants = relationship("Tenant", back_populates="owner", cascade="all, delete-orphan")
    documents_history = relationship("DocumentHistory", back_populates="user", cascade="all, delete-orphan")


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    inn = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, nullable=True)
    kpp = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    director_name = Column(String, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    owner = relationship("User", back_populates="tenants")
    documents_history = relationship("DocumentHistory", back_populates="tenant", cascade="all, delete-orphan")


class DocumentHistory(Base):
    __tablename__ = "documents_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False)
    document_type = Column(String, nullable=False)
    file_format = Column(String, nullable=False)  # pdf или word
    filename = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Связи
    user = relationship("User", back_populates="documents_history")
    tenant = relationship("Tenant", back_populates="documents_history")