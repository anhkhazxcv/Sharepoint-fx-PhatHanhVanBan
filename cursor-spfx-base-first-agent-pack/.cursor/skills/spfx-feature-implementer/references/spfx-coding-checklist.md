# SPFx Coding Checklist

- Match current SPFx/React/TypeScript versions.
- Follow existing component style and folder structure.
- Use existing service/repository/API client pattern.
- Keep async flows cancellable or safe against unmount where relevant.
- Handle loading, empty, error, and forbidden states where relevant.
- Avoid hard-coded tenant/site URLs.
- Avoid new Graph/API permissions unless explicitly requested.
- Do not invent SharePoint list/field names.
- Run relevant package.json validation script.
