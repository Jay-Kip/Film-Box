from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    DateTime,
    Boolean
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime

engine = create_engine("sqlite:///database.db")

Base = declarative_base()

Session = sessionmaker(bind=engine)
session = Session()


class Ticket(Base):
    __tablename__ = "tickets"

    # ✅ real primary key
    id = Column(Integer, primary_key=True, autoincrement=True)

    # generated after successful payment
    token = Column(String, unique=True, nullable=True)

    phone = Column(String)

    # MPESA tracking
    checkout_id = Column(String, unique=True)
    payment_status = Column(String, default="pending")
    mpesa_receipt = Column(String, nullable=True)

    # browser fingerprint restriction
    device_id = Column(String, nullable=True)

    # payment confirmation
    paid = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    expires_at = Column(DateTime, nullable=True)


def init_db():
    Base.metadata.create_all(engine)
