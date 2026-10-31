@REM ----------------------------------------------------------------------------
@REM Maven Wrapper Batch Script for Windows
@REM ----------------------------------------------------------------------------
@echo off
setlocal

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

if not defined JAVA_HOME (
  java -version >nul 2>&1
  if errorlevel 1 (
    echo [ERROR] Java not found. Please install Java 17+ or set JAVA_HOME.
    exit /b 1
  )
  set "JAVACMD=java"
) else (
  set "JAVACMD=%JAVA_HOME%\bin\java.exe"
)

set "WRAPPER_JAR=%BASE_DIR%\.mvn\wrapper\maven-wrapper.jar"

if exist "%WRAPPER_JAR%" (
  "%JAVACMD%" -Dmaven.home="%BASE_DIR%\.mvn\wrapper" -Dmaven.multiModuleProjectDirectory="%BASE_DIR%" -cp "%WRAPPER_JAR%" org.apache.maven.wrapper.MavenWrapperMain %*
) else (
  mvn %*
)

