import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import Request
from app.utils.cache_utils import cache_response
from app.models.schemas import ProcessingConfig

@pytest.mark.asyncio
async def test_cache_response_decorator():
    # Mock cache service
    mock_cache_service = AsyncMock()
    mock_cache_service.get.return_value = None
    
    with patch("app.utils.cache_utils.cache_service", mock_cache_service):
        # Define a dummy endpoint
        @cache_response(ttl=60)
        async def dummy_endpoint(request: Request):
            return {"data": "test"}

        # Create a mock request
        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/test"
        mock_request.query_params.items.return_value = []
        
        # Call the endpoint
        response = await dummy_endpoint(request=mock_request)
        
        # Verify response
        assert response == {"data": "test"}
        
        # Verify cache interaction
        mock_cache_service.get.assert_called_once()
        mock_cache_service.set.assert_called_once()

@pytest.mark.asyncio
async def test_cache_hit():
    # Mock cache service with existing data
    mock_cache_service = AsyncMock()
    mock_cache_service.get.return_value = {"data": "cached"}
    
    with patch("app.utils.cache_utils.cache_service", mock_cache_service):
        @cache_response(ttl=60)
        async def dummy_endpoint(request: Request):
            return {"data": "fresh"}

        mock_request = MagicMock(spec=Request)
        mock_request.url.path = "/test"
        mock_request.query_params.items.return_value = []
        
        response = await dummy_endpoint(request=mock_request)
        
        assert response == {"data": "cached"}
        mock_cache_service.get.assert_called_once()
        mock_cache_service.set.assert_not_called()
