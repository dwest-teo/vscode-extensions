

### Publish extension

https://marketplace.visualstudio.com/manage/publishers/britesnow

- refresh token - https://jeremychone.visualstudio.com/_usersSettings/tokens 
  - make sure select all accessible organization)
  - custom defined - show all scopes - marketplace (manage option)

https://code.visualstudio.com/docs/extensions/publish-extension

``` sh
# if login is needed
# Go there with jeremychone login https://jeremychone.visualstudio.com/_usersSettings/tokens (create token)
# IMPORTANT - Make sure to select ALL AVAILABLE ORGANIZATION
vsce login BriteSnow
# Press PAT ... 'y' and then give token

vsce publish
```

