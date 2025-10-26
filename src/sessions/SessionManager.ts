/**
 * Session Manager
 * Central management for all communication sessions
 */

import type {
  Session,
  SessionType,
  SessionConfig,
  VoiceSession,
  SMSSession,
  EmailSession,
  TextSession
} from './types';
import { logger } from '../utils/logger';

export class SessionManager {
  private sessions: Map<string, Session> = new Map();

  /**
   * Create a new session
   */
  async createSession<T extends Session>(
    type: SessionType,
    config: SessionConfig
  ): Promise<T> {
    const sessionId = this.generateSessionId(type);
    const conversationId = this.generateConversationId();

    const baseSession: Omit<Session, 'type'> = {
      id: sessionId,
      status: 'active',
      conversationId,
      createdAt: new Date(),
      lastActivity: new Date(),
      metadata: config.metadata
    };

    let session: Session;

    switch (type) {
      case 'voice':
        session = {
          ...baseSession,
          type: 'voice',
          phoneNumber: config.identifier
        } as VoiceSession;
        break;

      case 'sms':
        session = {
          ...baseSession,
          type: 'sms',
          phoneNumber: config.identifier
        } as SMSSession;
        break;

      case 'email':
        session = {
          ...baseSession,
          type: 'email',
          emailAddress: config.identifier
        } as EmailSession;
        break;

      case 'text':
        session = {
          ...baseSession,
          type: 'text',
          identifier: config.identifier
        } as TextSession;
        break;

      default:
        throw new Error(`Unsupported session type: ${type}`);
    }

    this.sessions.set(sessionId, session);

    logger.info(`[SessionManager] Created ${type} session`, {
      sessionId,
      conversationId,
      identifier: config.identifier
    });

    return session as T;
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get session by conversation ID
   */
  async getSessionByConversationId(conversationId: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.conversationId === conversationId) {
        return session;
      }
    }
    return null;
  }

  /**
   * Get session by identifier (phone number, email, etc.)
   */
  async getSessionByIdentifier(type: SessionType, identifier: string): Promise<Session | null> {
    for (const session of this.sessions.values()) {
      if (session.type === type) {
        switch (type) {
          case 'voice':
          case 'sms':
            if ((session as VoiceSession | SMSSession).phoneNumber === identifier) {
              return session;
            }
            break;
          case 'email':
            if ((session as EmailSession).emailAddress === identifier) {
              return session;
            }
            break;
          case 'text':
            if ((session as TextSession).identifier === identifier) {
              return session;
            }
            break;
        }
      }
    }
    return null;
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  /**
   * Update session status
   */
  async updateStatus(sessionId: string, status: Session['status']): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = status;
      logger.info(`[SessionManager] Updated session status`, {
        sessionId,
        status
      });
    }
  }

  /**
   * End a session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'completed';
      logger.info(`[SessionManager] Ended session`, { sessionId });
    }
  }

  /**
   * List all active sessions
   */
  async listActiveSessions(): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.status === 'active');
  }

  /**
   * List sessions by type
   */
  async listSessionsByType(type: SessionType): Promise<Session[]> {
    return Array.from(this.sessions.values()).filter(s => s.type === type);
  }

  /**
   * Clean up old inactive sessions
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = new Date().getTime();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const age = now - session.lastActivity.getTime();
      if (session.status !== 'active' && age > maxAge) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`[SessionManager] Cleaned up ${cleaned} old sessions`);
    }

    return cleaned;
  }

  /**
   * Get session count
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAll(): void {
    this.sessions.clear();
    logger.info('[SessionManager] Cleared all sessions');
  }

  // Private helper methods

  private generateSessionId(type: SessionType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${type}_${timestamp}_${random}`;
  }

  private generateConversationId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `conv_${timestamp}_${random}`;
  }
}
