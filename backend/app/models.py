from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Table
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

# ============================================================================
# Связующая таблица: Субъект ПДн <-> Информационная система (many-to-many)
# ============================================================================
pd_subject_data_systems = Table(
    "pd_subject_data_systems",
    Base.metadata,
    Column("id", Integer, primary_key=True, index=True),
    Column("pd_subject_id", Integer, ForeignKey("pd_subjects.id", ondelete="CASCADE")),
    Column("data_system_id", Integer, ForeignKey("data_systems.id", ondelete="CASCADE")),
    Column("created_at", DateTime, default=datetime.utcnow),
)

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
    data_systems = relationship("DataSystem", back_populates="user")

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
    data_systems = relationship("DataSystem", back_populates="tenant")

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
    data_systems = relationship(
        "DataSystem",
        secondary=pd_subject_data_systems,
        back_populates="pd_subjects",
    )

# ============================================================================
# НОВАЯ СУЩНОСТЬ: Информационная система (Карта обработки ПДн)
# ============================================================================
class DataSystem(Base):
    __tablename__ = "data_systems"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    system_type = Column(String)  # 'local' | 'cloud_saas' | 'file' | 'physical'
    # Категории субъектов храним как JSON-строку: '["employees","clients"]'
    # (работает и в SQLite, и в PostgreSQL без ARRAY-типов)
    categories = Column(Text, default="[]")
    data_location = Column(String, nullable=True)
    responsible_name = Column(String, nullable=True)
    responsible_position = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    user_id = Column(Integer, ForeignKey("users.id"))

    tenant = relationship("Tenant", back_populates="data_systems")
    user = relationship("User", back_populates="data_systems")
    pd_subjects = relationship(
        "PdSubject",
        secondary=pd_subject_data_systems,
        back_populates="data_systems",
    )