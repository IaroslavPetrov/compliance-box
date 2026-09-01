from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tenants = relationship("Tenant", back_populates="user")
    document_history = relationship("DocumentHistory", back_populates="user")
    pd_subjects = relationship("PdSubject", back_populates="user")

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    inn = Column(String, unique=True, index=True)
    email = Column(String)
    kpp = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    director_name = Column(String, nullable=True)
    website = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="tenants")
    document_history = relationship("DocumentHistory", back_populates="tenant")
    pd_subjects = relationship("PdSubject", back_populates="tenant")

class DocumentHistory(Base):
    __tablename__ = "document_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    document_type = Column(String)
    file_format = Column(String)
    filename = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="document_history")
    tenant = relationship("Tenant", back_populates="document_history")

class PdSubject(Base):
    __tablename__ = "pd_subjects"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String)
    category = Column(String)
    legal_basis = Column(String)
    data_types = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    tenant = relationship("Tenant", back_populates="pd_subjects")
    user = relationship("User", back_populates="pd_subjects")