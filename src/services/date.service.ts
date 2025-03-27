import logger from '../utils/logger';

class DateService {
  /**
   * Gets the Wednesday of a specific week in a year
   * @param week Week number (1-53)
   * @param year Year
   * @returns Date object representing the Wednesday of that week
   */
  getWednesdayOfWeek(week: number, year: number): Date {
    try {
      // Validate that week is a valid number
      if (isNaN(week) || week < 1 || week > 53) {
        logger.info(`Invalid week number: ${week}, using week 25 as fallback`);
        // Use a default week (middle of the year)
        week = 25;
      }

      // Create a date for January 1st of the specified year
      const startOfYear = new Date(year, 0, 1);

      // Find the first Wednesday of the year
      const dayOfWeek = startOfYear.getDay(); // 0 = Sunday, 3 = Wednesday
      const daysToWednesday = dayOfWeek <= 3 ? 3 - dayOfWeek : 10 - dayOfWeek;

      // Add days to get to the first Wednesday
      const firstWednesday = new Date(year, 0, 1 + daysToWednesday);

      // Add the necessary weeks (subtract 1 because the first week is already included)
      const targetWednesday = new Date(firstWednesday);
      targetWednesday.setDate(firstWednesday.getDate() + (week - 1) * 7);

      // Safety check
      if (isNaN(targetWednesday.getTime())) {
        logger.info(
          `Failed to calculate Wednesday for week ${week}, year ${year}, using fallback date`,
        );
        return new Date(year, 5, 15); // June 15th as fallback
      }

      return targetWednesday;
    } catch (error) {
      logger.info(`Error in getWednesdayOfWeek: ${error}, using fallback date`);
      // Return June 15th as a fallback
      return new Date(year, 5, 15);
    }
  }

  /**
   * Gets a date from a week text (format: "Semana XX") and year
   * @param weekText Week text (e.g., "Semana 12")
   * @param year Year
   * @returns Formatted date string in YYYY-MM-DD format
   */
  getDateFromWeek(weekText: string, year: number): string {
    try {
      // Default fallback date - middle of the year
      const fallbackDate = new Date(year, 5, 15);

      // Extract week number from format "Semana XX"
      if (!weekText || typeof weekText !== 'string') {
        logger.info(`Invalid week text: ${weekText}, using fallback date`);
        return this.formatDate(fallbackDate);
      }

      const weekParts = weekText.split(' ');
      if (weekParts.length < 2) {
        logger.info(`Invalid week format (no spaces): ${weekText}, using fallback date`);
        return this.formatDate(fallbackDate);
      }

      const weekNumber = parseInt(weekParts[1]);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        logger.info(`Invalid week number: ${weekParts[1]} from "${weekText}", using fallback date`);
        return this.formatDate(fallbackDate);
      }

      const wednesdayDate = this.getWednesdayOfWeek(weekNumber, year);
      return this.formatDate(wednesdayDate);
    } catch (error) {
      logger.info(`Error in getDateFromWeek: ${error}, using fallback date`);
      // Return a formatted date for June 15th as fallback
      return this.formatDate(new Date(year, 5, 15));
    }
  }

  /**
   * Formats a Date object to YYYY-MM-DD string
   * @param date Date object to format
   * @returns Formatted date string
   */
  formatDate(date: Date): string {
    try {
      if (!date || isNaN(date.getTime())) {
        // If date is invalid, return a fallback date string (current year, June 15)
        const currentYear = new Date().getFullYear();
        const fallbackDate = new Date(currentYear, 5, 15);

        const year = fallbackDate.getFullYear();
        const month = String(fallbackDate.getMonth() + 1).padStart(2, '0');
        const day = String(fallbackDate.getDate()).padStart(2, '0');

        logger.info(`Invalid date provided to formatDate, using fallback: ${year}-${month}-${day}`);
        return `${year}-${month}-${day}`;
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      logger.info(`Error in formatDate: ${error}, using fallback date`);
      // Return a fallback date string
      const currentYear = new Date().getFullYear();
      return `${currentYear}-06-15`;
    }
  }

  /**
   * Cleans and normalizes a date value, never returns null
   * @param date Date to clean (can be string, Date object, or null)
   * @param weekText Week text (used as fallback)
   * @param year Current year being processed
   * @returns Cleaned date string in YYYY-MM-DD format
   */
  cleanDate(date: string | null | Date, weekText: string, year: number): string {
    try {
      // CASE 1: If we have a valid date object, format it
      if (date instanceof Date && !isNaN(date.getTime())) {
        return this.formatDate(date);
      }

      // CASE 2: If date is a string and not "null", try to parse it
      if (typeof date === 'string' && date !== 'null') {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          return this.formatDate(dateObj);
        }
      }

      // CASE 3: Use week text as fallback (always returns a valid date string)
      return this.getDateFromWeek(weekText, year);
    } catch (error) {
      logger.info(`Error in cleanDate: ${error}, using fallback from week`);
      // Always use week as fallback, which itself has a fallback
      return this.getDateFromWeek(weekText, year);
    }
  }

  /**
   * Validates if a date is within a specific year range
   * @param dateStr Date string to validate
   * @param minYear Minimum year (inclusive)
   * @returns Boolean indicating if date is valid and within range
   */
  isDateValidAndInRange(dateStr: string, minYear: number = 2019): boolean {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return false;
      }
      return date.getFullYear() >= minYear;
    } catch (error) {
      return false;
    }
  }
}

export default new DateService();
