from sqlalchemy import create_engine, Column, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


engine = create_engine('sqlite:///database.db')
Base = declarative_base()

Session = sessionmaker(bind=engine)
session = Session()


class Ticket(Base):
    __tablename__ = 'tickets'

    token = Column(String, primary_key=True)
    phone = Column(String)
    expires_at = Column(DateTime)


def init_db():
    Base.metadata.create_all(engine)
