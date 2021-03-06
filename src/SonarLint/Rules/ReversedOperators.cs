﻿/*
 * SonarLint for Visual Studio
 * Copyright (C) 2015 SonarSource
 * sonarqube@googlegroups.com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02
 */

using System.Collections.Immutable;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using Microsoft.CodeAnalysis.Diagnostics;
using SonarLint.Common;
using SonarLint.Common.Sqale;
using SonarLint.Helpers;

namespace SonarLint.Rules
{
    [DiagnosticAnalyzer(LanguageNames.CSharp)]
    [SqaleConstantRemediation("2min")]
    [SqaleSubCharacteristic(SqaleSubCharacteristic.InstructionReliability)]
    [Rule(DiagnosticId, RuleSeverity, Title, IsActivatedByDefault)]
    [Tags(Tag.Bug)]
    public class ReversedOperators : DiagnosticAnalyzer
    {
        internal const string DiagnosticId = "S2757";
        internal const string Title = "Reversed operators should not be used";
        internal const string Description =
            "The use of operators pairs (\"=+\" or \"=-\") where the reversed, single operator " +
            "was meant (\"+=\" or \"-=\") will compile and run, but not produce the expected results. " +
            "This rule raises an issue when \"=+\", and \"=-\" are used, but ignores the operators " +
            "when they're spaced out: \"= +\", \"= -\".";
        internal const string MessageFormat = "Was \"{0}\" meant instead?";
        internal const string Category = "SonarLint";
        internal const Severity RuleSeverity = Severity.Critical;
        internal const bool IsActivatedByDefault = true;

        internal static readonly DiagnosticDescriptor Rule =
            new DiagnosticDescriptor(DiagnosticId, Title, MessageFormat, Category,
                RuleSeverity.ToDiagnosticSeverity(), IsActivatedByDefault,
                helpLinkUri: DiagnosticId.GetHelpLink(),
                description: Description);

        public override ImmutableArray<DiagnosticDescriptor> SupportedDiagnostics { get { return ImmutableArray.Create(Rule); } }

        public override void Initialize(AnalysisContext context)
        {
            context.RegisterSyntaxNodeActionInNonGenerated(
                c =>
                {
                    var unaryExpression = (PrefixUnaryExpressionSyntax) c.Node;

                    var op = unaryExpression.OperatorToken;
                    var prevToken = op.GetPreviousToken();

                    var opLocation = op.GetLocation();
                    var opStartPosition = opLocation.GetLineSpan().StartLinePosition;
                    var prevStartPosition = prevToken.GetLocation().GetLineSpan().StartLinePosition;

                    if (prevToken.IsKind(SyntaxKind.EqualsToken) &&
                        prevStartPosition.Line == opStartPosition.Line &&
                        prevStartPosition.Character == opStartPosition.Character - 1)
                    {
                        c.ReportDiagnostic(Diagnostic.Create(Rule, opLocation, string.Format("{0}=", op.Text)));
                    }
                },
                SyntaxKind.UnaryMinusExpression,
                SyntaxKind.UnaryPlusExpression);
        }
    }
}
