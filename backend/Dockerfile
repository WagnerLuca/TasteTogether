FROM mcr.microsoft.com/dotnet/sdk:10.0 AS builder
WORKDIR /app
COPY *.csproj ./
RUN dotnet restore
COPY . ./
RUN dotnet publish -c Release -o out --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=builder /app/out .
USER app
# 3001 is what the frontend's nginx.conf proxies /api/ to.
ENV ASPNETCORE_HTTP_PORTS=3001
EXPOSE 3001
ENTRYPOINT ["dotnet", "TasteTogether.Api.dll"]
