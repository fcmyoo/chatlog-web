import { errorMiddleware, AppError, ValidationError, BusinessError } from '../middleware/errorHandler.js';

describe('Error Handler Middleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        next = jest.fn();
    });

    test('should handle AppError correctly', () => {
        const error = new AppError('Test error', 'VALIDATION_ERROR', 400);
        errorMiddleware(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'VALIDATION_ERROR',
                message: 'Test error',
                timestamp: expect.any(String)
            }
        });
    });

    test('should handle Axios error correctly', () => {
        const error = {
            response: {
                status: 502,
                data: { message: 'External API error' }
            }
        };
        errorMiddleware(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'EXTERNAL_API_ERROR',
                message: 'External API error',
                timestamp: expect.any(String)
            }
        });
    });

    test('should handle network error correctly', () => {
        const error = { code: 'ECONNREFUSED', message: 'Connection refused' };
        errorMiddleware(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(502);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'EXTERNAL_API_ERROR',
                message: '外部服务连接失败',
                timestamp: expect.any(String)
            }
        });
    });

    test('should handle unknown error correctly', () => {
        const error = new Error('Unknown error');
        errorMiddleware(error, req, res, next);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
            success: false,
            error: {
                type: 'SYSTEM_ERROR',
                message: '系统内部错误',
                timestamp: expect.any(String)
            }
        });
    });
});