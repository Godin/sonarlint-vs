/*
 * Copyright (C) 2009-2012 SonarSource SA
 * All rights reserved
 * mailto:contact AT sonarsource DOT com
 */
package com.sonar.csharp.squid.parser.rules.interfaces;

import static com.sonar.sslr.test.parser.ParserMatchers.*;
import static org.junit.Assert.*;

import java.nio.charset.Charset;

import org.junit.Before;
import org.junit.Test;

import com.sonar.csharp.squid.CSharpConfiguration;
import com.sonar.csharp.squid.api.CSharpGrammar;
import com.sonar.csharp.squid.parser.CSharpParser;
import com.sonar.sslr.impl.Parser;

public class InterfaceMethodDeclarationTest {

  private final Parser<CSharpGrammar> p = CSharpParser.create(new CSharpConfiguration(Charset.forName("UTF-8")));
  private final CSharpGrammar g = p.getGrammar();

  @Before
  public void init() {
    p.setRootRule(g.interfaceMethodDeclaration);
    g.attributes.mock();
    g.returnType.mock();
    g.typeParameterList.mock();
    g.formalParameterList.mock();
    g.typeParameterConstraintsClauses.mock();
  }

  @Test
  public void testOk() {
    assertThat(p, parse("returnType id ();"));
    assertThat(p, parse("attributes new returnType id typeParameterList (formalParameterList) typeParameterConstraintsClauses;"));
  }

}