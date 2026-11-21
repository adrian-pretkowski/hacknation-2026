"""Fasada: jeden obiekt z wszystkimi symulowanymi systemami (wstrzykiwany do routera/testów)."""
import datetime as dt
from collections.abc import Callable

from app.integrations.simulated.applications import ApplicationService
from app.integrations.simulated.civil_registry import CivilRegistryService
from app.integrations.simulated.debt import DebtService
from app.integrations.simulated.ezla import EzlaService
from app.integrations.simulated.mobywatel import MObywatelService
from app.integrations.simulated.pue import PueService
from app.integrations.simulated.zus_account import ZusAccountService


class SimulatedSystems:
    def __init__(self, today: Callable[[], dt.date] = dt.date.today) -> None:
        self.mobywatel = MObywatelService()
        self.zus = ZusAccountService()
        self.ezla = EzlaService()
        self.debt = DebtService()
        self.pue = PueService()
        self.applications = ApplicationService(today)
        self.civil_registry = CivilRegistryService()
