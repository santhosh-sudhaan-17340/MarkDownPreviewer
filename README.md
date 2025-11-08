# Sourastra Matrimony

A modern matrimony platform designed specifically for the Sourastra community to help members find compatible life partners. Built with Spring Boot and following industry-standard three-tier architecture patterns.

![Java](https://img.shields.io/badge/Java-17-orange.svg)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## What is this application?

This is a matrimony platform designed specifically for the Sourastra community to help members find compatible life partners. The application allows users to:

- Create and manage their matrimonial profiles
- Browse other profiles with advanced filtering and sorting
- Express interest in compatible profiles
- Manage their received interests
- Search profiles by name, city, gender, and date of birth

## Technical Overview

Built using Spring Boot 3.2.0 with Java 17, this application provides RESTful APIs for profile management and uses PostgreSQL as the database. The application follows a clean three-tier architecture pattern for maintainable and scalable code.

## Architecture

The application is structured using a three-tier architecture:

- **Controller Layer**: Handles incoming HTTP requests, validates them, and passes them to the service layer. It's responsible for the API endpoints.
- **Service Layer**: Contains the business logic of the application. It processes data from the controller and interacts with the repository layer.
- **Repository Layer**: Responsible for data access. It interacts with the database using Spring Data JPA.

This separation of concerns makes the application modular, easier to maintain, and scalable.

```
src/main/java/com/sourastra/matrimony/
├── SoustraMatrimonyApplication.java    # Main application class
├── controller/
│   ├── ProfileController.java          # REST endpoints
│   └── GlobalExceptionHandler.java     # Global error handling
├── service/
│   ├── ProfileService.java             # Profile business logic
│   └── InterestService.java            # Interest business logic
├── repository/
│   ├── ProfileRepository.java          # Profile data access
│   ├── InterestRepository.java         # Interest data access
│   └── ProfileSpecification.java       # JPA Specifications for filtering
├── entity/
│   ├── Profile.java                    # Profile entity
│   └── Interest.java                   # Interest entity
└── dto/
    ├── InterestRequest.java            # Interest request DTO
    └── InterestResponse.java           # Interest response DTO
```

## Features

- **Profile Management**: Create, read, update, and delete user profiles
- **Advanced Filtering**: Filter profiles by name, city, gender, and date of birth range
- **Flexible Sorting**: Sort results by name, city, gender, or date of birth
- **Interest System**: Express interest in other profiles with optional messages
- **Validation**: Comprehensive input validation using Jakarta Bean Validation
- **Error Handling**: Global exception handling with meaningful error messages
- **Database**: PostgreSQL with JPA/Hibernate ORM
- **RESTful API**: Clean REST API design following best practices

## Prerequisites

Before you can run this application, you need to have the following installed:

- **Java 17 or later**: Download from [Oracle](https://www.oracle.com/java/technologies/javase-jdk17-downloads.html) or use OpenJDK
- **Maven**: Build automation tool. Download from [Maven website](https://maven.apache.org/download.cgi)
- **PostgreSQL**: Open-source object-relational database system. Download from [PostgreSQL website](https://www.postgresql.org/download/)

## Database Setup

### 1. Install PostgreSQL

Follow the instructions on the PostgreSQL website to install it on your system.

### 2. Create the database

Open the PostgreSQL command-line tool (`psql`) and create a new database:

```sql
CREATE DATABASE sourastra_matrimony_db;
```

Alternatively, you can use pgAdmin or any PostgreSQL GUI tool.

### 3. Configure the connection

Open the `src/main/resources/application.properties` file and update the database connection settings:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/sourastra_matrimony_db
spring.datasource.username=postgres
spring.datasource.password=your_password_here
```

Replace `your_password_here` with your PostgreSQL password.

## How to Run the Application

### 1. Clone the repository

```bash
git clone https://github.com/santhosh-sudhaan-17340/MarkDownPreviewer.git
cd MarkDownPreviewer
```

### 2. Build the project

```bash
mvn clean install
```

This will download all dependencies and compile the project.

### 3. Run the application

```bash
mvn spring-boot:run
```

The application will start on `http://localhost:8080`.

You should see output similar to:

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::                (v3.2.0)

...
Started SoustraMatrimonyApplication in X.XXX seconds
```

## API Endpoints

### Get All Profiles

Retrieves a list of all profiles with optional filtering and sorting.

- **URL**: `/api/profiles`
- **Method**: `GET`
- **Query Parameters**:
  - `name` (optional): Partial, case-insensitive match on profile name
  - `city` (optional): Case-insensitive exact match on city
  - `gender` (optional): Case-insensitive exact match on gender (Male, Female, Other)
  - `dobFrom` (optional): Inclusive ISO-8601 date filter (e.g., `1990-01-01`)
  - `dobTo` (optional): Inclusive ISO-8601 date filter (e.g., `2000-12-31`)
  - `sortBy` (optional): One of `name`, `city`, `gender`, or `dateOfBirth` (defaults to `name`)
  - `sortDirection` (optional): `ASC` or `DESC` (defaults to `ASC`)

**Example Request**:
```bash
GET http://localhost:8080/api/profiles?city=Madurai&gender=Male&sortBy=name&sortDirection=ASC
```

**Example Response**:
```json
[
    {
        "id": 1,
        "name": "Santhosh Kumar",
        "email": "santhosh@example.com",
        "phone": "1234567890",
        "gender": "Male",
        "dateOfBirth": "1990-01-15",
        "city": "Madurai"
    },
    {
        "id": 2,
        "name": "Priya Krishnan",
        "email": "priya@example.com",
        "phone": "0987654321",
        "gender": "Female",
        "dateOfBirth": "1992-05-20",
        "city": "Dindigul"
    }
]
```

### Get Profile by ID

Retrieves a single profile by their ID.

- **URL**: `/api/profiles/{id}`
- **Method**: `GET`
- **URL Parameters**: `id` - Profile ID (Long)

**Example Request**:
```bash
GET http://localhost:8080/api/profiles/1
```

**Example Response**:
```json
{
    "id": 1,
    "name": "Santhosh Kumar",
    "email": "santhosh@example.com",
    "phone": "1234567890",
    "gender": "Male",
    "dateOfBirth": "1990-01-15",
    "city": "Madurai"
}
```

### Create a New Profile

Creates a new profile.

- **URL**: `/api/profiles`
- **Method**: `POST`
- **Request Body**: JSON object with profile details

**Example Request**:
```bash
POST http://localhost:8080/api/profiles
Content-Type: application/json

{
    "name": "New Profile",
    "email": "newprofile@example.com",
    "phone": "5555555555",
    "gender": "Male",
    "dateOfBirth": "1995-03-10",
    "city": "Chennai"
}
```

**Validation Rules**:
- `name`: Required, 2-100 characters
- `email`: Required, valid email format, unique
- `phone`: Required, exactly 10 digits
- `gender`: Required, must be Male, Female, or Other
- `dateOfBirth`: Required, must be in the past
- `city`: Required, 2-100 characters

**Example Response**:
```json
{
    "id": 4,
    "name": "New Profile",
    "email": "newprofile@example.com",
    "phone": "5555555555",
    "gender": "Male",
    "dateOfBirth": "1995-03-10",
    "city": "Chennai"
}
```

### Update an Existing Profile

Updates an existing profile's information.

- **URL**: `/api/profiles/{id}`
- **Method**: `PUT`
- **URL Parameters**: `id` - Profile ID (Long)
- **Request Body**: JSON object with updated profile details

**Example Request**:
```bash
PUT http://localhost:8080/api/profiles/1
Content-Type: application/json

{
    "name": "Santhosh Kumar Updated",
    "email": "santhosh.updated@example.com",
    "phone": "1234567899",
    "gender": "Male",
    "dateOfBirth": "1990-01-15",
    "city": "Madurai"
}
```

**Example Response**:
```json
{
    "id": 1,
    "name": "Santhosh Kumar Updated",
    "email": "santhosh.updated@example.com",
    "phone": "1234567899",
    "gender": "Male",
    "dateOfBirth": "1990-01-15",
    "city": "Madurai"
}
```

### Delete a Profile

Deletes a profile by their ID.

- **URL**: `/api/profiles/{id}`
- **Method**: `DELETE`
- **URL Parameters**: `id` - Profile ID (Long)

**Example Request**:
```bash
DELETE http://localhost:8080/api/profiles/1
```

**Response**: `204 No Content` (successful deletion)

### Express Interest in a Profile

Records that one profile has shown interest in another profile.

- **URL**: `/api/profiles/{id}/interests`
- **Method**: `POST`
- **URL Parameters**: `id` - Target profile ID (Long)
- **Request Body**: JSON object with interest details

**Example Request**:
```bash
POST http://localhost:8080/api/profiles/2/interests
Content-Type: application/json

{
    "fromProfileId": 1,
    "message": "Hi Priya, I would love to connect and learn more about you."
}
```

**Business Rules**:
- Both profiles must exist
- Cannot express interest in your own profile
- Cannot express interest if already expressed before

**Example Response**:
```json
{
    "id": 1,
    "fromProfileId": 1,
    "toProfileId": 2,
    "message": "Hi Priya, I would love to connect and learn more about you.",
    "createdAt": "2024-05-05T10:30:45.123"
}
```

## Error Handling

The API provides detailed error messages for various scenarios:

### Validation Errors

```json
{
    "status": 400,
    "error": "Validation Failed",
    "validationErrors": {
        "email": "Email should be valid",
        "phone": "Phone number must be 10 digits"
    }
}
```

### Business Logic Errors

```json
{
    "status": 400,
    "error": "Email already exists: test@example.com"
}
```

### Not Found Errors

```json
{
    "status": 400,
    "error": "Profile not found with id: 999"
}
```

## Testing with cURL

Here are some example cURL commands to test the API:

### Create a Profile
```bash
curl -X POST http://localhost:8080/api/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "9876543210",
    "gender": "Male",
    "dateOfBirth": "1995-06-15",
    "city": "Madurai"
  }'
```

### Get All Profiles
```bash
curl http://localhost:8080/api/profiles
```

### Get Profile by ID
```bash
curl http://localhost:8080/api/profiles/1
```

### Update Profile
```bash
curl -X PUT http://localhost:8080/api/profiles/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "updated@example.com",
    "phone": "9876543211",
    "gender": "Male",
    "dateOfBirth": "1995-06-15",
    "city": "Chennai"
  }'
```

### Delete Profile
```bash
curl -X DELETE http://localhost:8080/api/profiles/1
```

### Express Interest
```bash
curl -X POST http://localhost:8080/api/profiles/2/interests \
  -H "Content-Type: application/json" \
  -d '{
    "fromProfileId": 1,
    "message": "Hello, I would like to connect with you."
  }'
```

## Configuration

Key configuration properties in `application.properties`:

```properties
# Server Configuration
server.port=8080

# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/sourastra_matrimony_db
spring.datasource.username=postgres
spring.datasource.password=password

# JPA/Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Logging Configuration
logging.level.org.springframework.web=INFO
logging.level.com.sourastra.matrimony=DEBUG
```

### Important Configuration Options

- `spring.jpa.hibernate.ddl-auto=update`: Automatically updates the database schema based on entity changes. Use `validate` in production.
- `spring.jpa.show-sql=true`: Shows SQL queries in console logs (useful for debugging)
- `server.port`: Change the application port if needed

## Technologies Used

- **Spring Boot 3.2.0**: Application framework
- **Spring Data JPA**: Data access and ORM
- **Spring Web**: RESTful web services
- **Spring Validation**: Bean validation
- **PostgreSQL**: Relational database
- **Hibernate**: JPA implementation
- **Lombok**: Reduce boilerplate code
- **Maven**: Build and dependency management

## Development

### Project Structure

The project follows standard Maven directory structure:

```
MarkDownPreviewer/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/sourastra/matrimony/
│   │   └── resources/
│   │       └── application.properties
│   └── test/
│       └── java/
├── pom.xml
└── README.md
```

### Building for Production

1. Update `application.properties` for production settings:
   ```properties
   spring.jpa.hibernate.ddl-auto=validate
   spring.jpa.show-sql=false
   ```

2. Build the JAR file:
   ```bash
   mvn clean package -DskipTests
   ```

3. Run the JAR:
   ```bash
   java -jar target/sourastra-matrimony-1.0.0.jar
   ```

### Environment Variables

You can override properties using environment variables:

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/sourastra_matrimony_db
export SPRING_DATASOURCE_USERNAME=postgres
export SPRING_DATASOURCE_PASSWORD=your_password
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   # On Linux/Mac
   sudo systemctl status postgresql

   # On Windows
   Check Services for PostgreSQL
   ```

2. Check database exists:
   ```sql
   \l  -- in psql to list databases
   ```

3. Verify credentials in `application.properties`

### Port Already in Use

If port 8080 is already in use:

1. Change the port in `application.properties`:
   ```properties
   server.port=8081
   ```

2. Or kill the process using the port (Linux/Mac):
   ```bash
   lsof -ti:8080 | xargs kill -9
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is open source and available under the MIT License.

## Support

For support and questions:

1. Check this README for common issues
2. Review the API documentation above
3. Open an issue on GitHub

## Acknowledgments

- Spring Boot team for the excellent framework
- Sourastra community for the inspiration
- Contributors and users of this application

---

**Made with ❤️ for the Sourastra community**
