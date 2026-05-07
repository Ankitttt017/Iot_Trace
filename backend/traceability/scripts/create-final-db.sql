IF DB_ID(N'IOT_Trace') IS NULL
BEGIN
  CREATE DATABASE [IOT_Trace];
END;
GO

USE [IOT_Trace];
GO

PRINT 'Final common database ready: IOT_Trace';
GO
