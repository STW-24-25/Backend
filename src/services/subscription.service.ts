import {
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
} from '@aws-sdk/client-sns';
import { snsClient, SNS_CONFIG } from '../config/sns.config';
import logger from '../utils/logger';

class SubscriptionService {
  private readonly snsClient: SNSClient;

  constructor() {
    this.snsClient = snsClient;
  }

  /**
   * Suscribe un email a un tópico SNS
   * @param email Email a suscribir
   * @returns Subscription ARN o null si no se pudo suscribir
   */
  async subscribeEmail(email: string): Promise<string | null> {
    try {
      if (!SNS_CONFIG.TOPIC_ARN) {
        logger.error('No se puede suscribir: SNS_TOPIC_ARN no está configurado');
        return null;
      }

      logger.info(`Suscribiendo email ${email} al tópico SNS`);

      const command = new SubscribeCommand({
        Protocol: 'email',
        TopicArn: SNS_CONFIG.TOPIC_ARN,
        Endpoint: email,
        ReturnSubscriptionArn: true,
      });

      const response = await this.snsClient.send(command);

      if (response.SubscriptionArn) {
        logger.info(`Email ${email} suscrito correctamente. ARN: ${response.SubscriptionArn}`);
        return response.SubscriptionArn;
      } else {
        logger.warn(`No se pudo suscribir el email ${email}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error al suscribir email ${email} al tópico SNS: ${error}`);
      return null;
    }
  }

  /**
   * Suscribe un número de teléfono a un tópico SNS
   * @param phoneNumber Número de teléfono a suscribir (formato E.164, ej. +34612345678)
   * @returns Subscription ARN o null si no se pudo suscribir
   */
  async subscribePhone(phoneNumber: string): Promise<string | null> {
    try {
      if (!SNS_CONFIG.TOPIC_ARN) {
        logger.error('No se puede suscribir: SNS_TOPIC_ARN no está configurado');
        return null;
      }

      logger.info(`Suscribiendo teléfono ${phoneNumber} al tópico SNS`);

      const command = new SubscribeCommand({
        Protocol: 'sms',
        TopicArn: SNS_CONFIG.TOPIC_ARN,
        Endpoint: phoneNumber,
        ReturnSubscriptionArn: true,
      });

      const response = await this.snsClient.send(command);

      if (response.SubscriptionArn) {
        logger.info(
          `Teléfono ${phoneNumber} suscrito correctamente. ARN: ${response.SubscriptionArn}`,
        );
        return response.SubscriptionArn;
      } else {
        logger.warn(`No se pudo suscribir el teléfono ${phoneNumber}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error al suscribir teléfono ${phoneNumber} al tópico SNS: ${error}`);
      return null;
    }
  }

  /**
   * Busca la suscripción de un endpoint (email o teléfono) en el tópico
   * @param endpoint Email o teléfono a buscar
   * @returns ARN de la suscripción o null si no se encuentra
   */
  async findSubscription(endpoint: string): Promise<string | null> {
    try {
      if (!SNS_CONFIG.TOPIC_ARN) {
        logger.error('No se puede buscar suscripción: SNS_TOPIC_ARN no está configurado');
        return null;
      }

      logger.info(`Buscando suscripción para ${endpoint}`);

      const command = new ListSubscriptionsByTopicCommand({
        TopicArn: SNS_CONFIG.TOPIC_ARN,
      });

      const response = await this.snsClient.send(command);

      if (response.Subscriptions && response.Subscriptions.length > 0) {
        const subscription = response.Subscriptions.find(sub => sub.Endpoint === endpoint);

        if (subscription && subscription.SubscriptionArn) {
          logger.info(`Suscripción encontrada para ${endpoint}: ${subscription.SubscriptionArn}`);
          return subscription.SubscriptionArn;
        }
      }

      logger.info(`No se encontró suscripción para ${endpoint}`);
      return null;
    } catch (error) {
      logger.error(`Error al buscar suscripción para ${endpoint}: ${error}`);
      return null;
    }
  }

  /**
   * Elimina la suscripción de un usuario
   * @param subscriptionArn ARN de la suscripción a eliminar
   * @returns true si se eliminó correctamente, false en caso contrario
   */
  async unsubscribe(subscriptionArn: string): Promise<boolean> {
    try {
      logger.info(`Eliminando suscripción: ${subscriptionArn}`);

      const command = new UnsubscribeCommand({
        SubscriptionArn: subscriptionArn,
      });

      await this.snsClient.send(command);
      logger.info(`Suscripción eliminada correctamente: ${subscriptionArn}`);
      return true;
    } catch (error) {
      logger.error(`Error al eliminar suscripción ${subscriptionArn}: ${error}`);
      return false;
    }
  }

  /**
   * Gestiona las suscripciones de un usuario (email y teléfono)
   * @param email Email del usuario
   * @param phoneNumber Número de teléfono del usuario (opcional)
   * @returns true si todas las operaciones fueron exitosas
   */
  async manageUserSubscriptions(email: string, phoneNumber?: string): Promise<boolean> {
    try {
      logger.info(`Gestionando suscripciones para usuario con email: ${email}`);

      // Suscribir email
      await this.subscribeEmail(email);

      // Suscribir teléfono si está disponible
      if (phoneNumber) {
        await this.subscribePhone(phoneNumber);
      }

      return true;
    } catch (error) {
      logger.error(`Error al gestionar suscripciones para ${email}: ${error}`);
      return false;
    }
  }

  /**
   * Elimina todas las suscripciones de un usuario
   * @param email Email del usuario
   * @param phoneNumber Número de teléfono del usuario (opcional)
   * @returns true si todas las operaciones fueron exitosas
   */
  async removeUserSubscriptions(email: string, phoneNumber?: string): Promise<boolean> {
    try {
      logger.info(`Eliminando suscripciones para usuario con email: ${email}`);

      // Buscar y eliminar suscripción de email
      const emailSubArn = await this.findSubscription(email);
      if (emailSubArn) {
        await this.unsubscribe(emailSubArn);
      }

      // Buscar y eliminar suscripción de teléfono si está disponible
      if (phoneNumber) {
        const phoneSubArn = await this.findSubscription(phoneNumber);
        if (phoneSubArn) {
          await this.unsubscribe(phoneSubArn);
        }
      }

      return true;
    } catch (error) {
      logger.error(`Error al eliminar suscripciones para ${email}: ${error}`);
      return false;
    }
  }

  /**
   * Actualiza las suscripciones de un usuario (elimina las existentes y crea nuevas)
   * @param email Email del usuario
   * @param phoneNumber Número de teléfono del usuario (opcional)
   * @returns true si todas las operaciones fueron exitosas
   */
  async updateUserSubscriptions(email: string, phoneNumber?: string): Promise<boolean> {
    try {
      logger.info(`Actualizando suscripciones para usuario con email: ${email}`);

      // Primero eliminar suscripciones existentes
      await this.removeUserSubscriptions(email, phoneNumber);

      // Luego crear nuevas suscripciones
      return await this.manageUserSubscriptions(email, phoneNumber);
    } catch (error) {
      logger.error(`Error al actualizar suscripciones para ${email}: ${error}`);
      return false;
    }
  }
}

export default new SubscriptionService();
