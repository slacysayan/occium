from fastapi import APIRouter, HTTPException
from models import ConnectedAccount, User
from typing import List
from beanie import PydanticObjectId

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.get("/{user_id}", response_model=List[ConnectedAccount])
async def get_accounts(user_id: str):
    accounts = await ConnectedAccount.find(ConnectedAccount.user_id == user_id).to_list()
    return accounts

@router.delete("/{account_id}")
async def disconnect_account(account_id: str):
    account = await ConnectedAccount.get(PydanticObjectId(account_id))
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    await account.delete()
    return {"status": "deleted"}
