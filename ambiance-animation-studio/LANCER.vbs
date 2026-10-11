' Double-clic = lance 1-LANCER.bat sans fermer la fenetre trop vite
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
bat = folder & "\1-LANCER.bat"
If Not fso.FileExists(bat) Then
  MsgBox "Fichier 1-LANCER.bat introuvable dans:" & vbCrLf & folder, 16, "Ambiance Animation Studio"
  WScript.Quit 1
End If
' 1 = montre la fenetre
sh.Run """" & bat & """", 1, True
