package com.sandipsky.inventory_system.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.IntegerSchema;
import io.swagger.v3.oas.models.media.ObjectSchema;
import io.swagger.v3.oas.models.media.StringSchema;
import io.swagger.v3.oas.models.parameters.Parameter;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.customizers.OperationCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class OpenApiConfig {

    private static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI inventorySystemOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Inventory Management System API")
                        .description(
                                "REST API for the Inventory Management System — masters, purchases, sales, inventory, accounting, reports, settings, users and auth. "
                                        + "Login via POST /login to obtain a JWT, then click Authorize and paste the token.")
                        .version("v0.0.1"))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_AUTH))
                .components(new Components()
                        .addSecuritySchemes(BEARER_AUTH, new SecurityScheme()
                                .name(BEARER_AUTH)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    /**
     * List endpoints take a catch-all {@code @RequestParam Map<String, String>}, which springdoc
     * can only render as one opaque object parameter. Replace it with the real contract:
     * pageIndex / pageSize / sort plus a free-form exploded `filters` object whose keys are sent
     * as individual query params (?name=elec).
     */
    @Bean
    public OperationCustomizer paginationParamsCustomizer() {
        return (operation, handlerMethod) -> {
            boolean takesParamMap = java.util.Arrays.stream(handlerMethod.getMethodParameters())
                    .anyMatch(p -> Map.class.isAssignableFrom(p.getParameterType()));
            if (!takesParamMap || operation.getParameters() == null) {
                return operation;
            }
            boolean removed = operation.getParameters()
                    .removeIf(p -> "query".equals(p.getIn()) && p.getSchema() != null
                            && "object".equals(p.getSchema().getType()));
            if (!removed) {
                return operation;
            }
            operation.addParametersItem(new Parameter().name("pageIndex").in("query")
                    .description("Zero-based page index")
                    .schema(new IntegerSchema()._default(0)));
            operation.addParametersItem(new Parameter().name("pageSize").in("query")
                    .description("Page size")
                    .schema(new IntegerSchema()._default(25)));
            operation.addParametersItem(new Parameter().name("sort").in("query")
                    .description("field:asc|desc — comma-separated for multi-sort")
                    .schema(new StringSchema().example("name:asc")));
            operation.addParametersItem(new Parameter().name("filters").in("query")
                    .style(Parameter.StyleEnum.FORM).explode(true)
                    .description("Field filters — each key is sent as its own query param and matched "
                            + "case-insensitively as 'contains' (e.g. {\"name\": \"elec\"} → ?name=elec). "
                            + "Nested fields use dot notation (party.name).")
                    .schema(new ObjectSchema().additionalProperties(new StringSchema())));
            return operation;
        };
    }
}
